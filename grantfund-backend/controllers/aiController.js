const { Grant, Fund, Expense, Proposal, GrantDeadline, ComplianceCheckpoint, HistoricalGrant } = require('../models');
const { prompt: systemPrompt } = require('../prompts/prompt');

/**
 * Controller to handle AI suggestions using Local Ollama
 */
const suggestGrants = async (req, res, next) => {
  try {
    const { messages } = req.body;
    
    // 1. Prepare Context
    let grantFilter = { status: 'Active' };
    if (req.user.role === 'subrecipient') {
      const assignments = await GrantAssignment.find({ userId: req.user.id });
      const assignedIds = assignments.map(a => a.grantId);
      grantFilter.id = { $in: assignedIds };
    }
    const liveGrants = await Grant.find(grantFilter).limit(10).select('id title agency amount purpose summary eligibilityShort');
    const grantIds = liveGrants.map(g => g.id);
    const activeFunds = await Fund.find({ grantId: { $in: grantIds } }).limit(10);
    
    let expenseFilter = { grantId: { $in: grantIds } };
    if (req.user.role === 'subrecipient') expenseFilter.submittedBy = req.user.id;
    const recentExpenses = await Expense.find(expenseFilter).populate('grant', 'title').sort({ createdAt: -1 }).limit(5);
    const historicalProposals = await HistoricalGrant.find().limit(3);

    const context = {
      availableGrants: liveGrants,
      financialStatus: {
        funds: activeFunds.map(f => ({ category: f.category, allocated: f.allocatedAmount, spent: f.spentAmount })),
        expenses: recentExpenses.map(e => ({ amount: e.amount, description: e.description, status: e.status }))
      },
      historicalReferences: historicalProposals.map(p => ({ title: p.title, outcome: p.outcomeNotes }))
    };

    const systemMsg = `${systemPrompt.content}\n\n### LIVE DATA CONTEXT (Source of Truth):\n${JSON.stringify(context)}`;

    // Prepare core messages for AI SDK
    const coreMessages = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: String(m.content)
    }));

    const Groq = require('groq-sdk');
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    console.log('🤖 [AI] Using Groq SDK (Llama 3.3)... Sending request...');
    
    const stream = await groq.chat.completions.create({
      messages: [{ role: 'system', content: systemMsg }, ...coreMessages],
      model: 'llama-3.3-70b-versatile',
      stream: true,
    });

    console.log('🤖 [AI] Stream returned successfully. Setting headers...');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        process.stdout.write('c');
        // Vercel AI Data Stream Protocol: 0:"text"\n
        res.write(`0:${JSON.stringify(content)}\n`);
      }
    }
    console.log('\n🤖 [AI] Stream consumed successfully. Ending response.');
    res.end();

  } catch (error) {
    console.error('❌ [AI] Critical Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'AI Assistant currently unavailable', error: error.message });
    }
  }
};

/**
 * @route   POST /api/ai/save-proposal
 * @desc    Save an AI-generated proposal draft
 * @access  Private
 */
const saveProposal = async (req, res, next) => {
  try {
    const { grantId, title, content } = req.body;

    const proposal = await Proposal.create({
      id: crypto.randomUUID(),
      grantId,
      userId: req.user.id,
      title: title || `Draft Proposal for ${grantId}`,
      content: content || {},
      status: 'Draft'
    });

    res.status(201).json({
      success: true,
      message: 'Proposal draft saved successfully',
      data: proposal
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle contextual AI suggestions for specific proposal sections
 */
const suggestContextual = async (req, res, next) => {
  try {
    const { section, currentContent, grantId } = req.body;

    if (!section || !grantId) {
      return res.status(400).json({ success: false, message: 'Section and Grant ID are required' });
    }

    // 1. Fetch Context
    const grant = await Grant.findOne({ id: grantId });
    if (!grant) return res.status(404).json({ success: false, message: 'Grant not found' });

    const historicalProposals = await HistoricalGrant.find({ 
      $or: [
        { keywords: { $in: [section] } },
        { title: { $regex: grant.title.split(' ')[0], $options: 'i' } }
      ]
    }).limit(2);
    const activeFunds = await Fund.find({ grantId });

    const context = {
      grantPurpose: grant.purpose,
      grantEligibility: grant.eligibilityShort,
      grantAvailableAmount: grant.amount,
      historicalContext: historicalProposals.map(p => ({ title: p.title, content: p.content })),
      financialConstraints: activeFunds.map(f => ({ category: f.category, allocated: f.allocatedAmount }))
    };

    const sectionPrompts = {
      'executive-summary': 'Draft a compelling 2-sentence executive summary that highlights community benefit.',
      'budget-narrative': 'Check if the budget items align with the available funds and suggest justifications.',
      'project-description': 'Suggest 3 strategic goals that align with the grant purpose.',
      'impact': 'Identify 2 measurable outcomes for this project based on historical successes.'
    };

    const specificInstruction = sectionPrompts[section] || 'Provide suggestions to improve this section based on the grant requirements.';

    const systemMsg = `You are a Senior Grant Consultant.
    CONTEXT: ${JSON.stringify(context)}
    
    ACTION: ${specificInstruction}
    
    GUIDELINES:
    - Be concise and actionable.
    - If there are budget concerns, flag them immediately.
    - Focus on funder alignment and strategic impact.
    - Respond in a clear, bulleted format.`;

    const userMsg = `Current content for section "${section}":\n${currentContent || '[Empty]'}`;

    const Groq = require('groq-sdk');
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user', content: userMsg }
      ],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || "";

    res.json({
      success: true,
      suggestions: responseText,
      section
    });

  } catch (error) {
    console.error('❌ [AI Suggestion] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate contextual suggestions' });
  }
};

/**
 * Controller to generate a full, structured grant proposal autonomously
 */
const generateFullProposal = async (req, res, next) => {
  try {
    const { grantId } = req.body;
    if (!grantId) return res.status(400).json({ success: false, message: 'Grant ID is required' });

    // 1. Fetch comprehensive context
    const grant = await Grant.findOne({ id: grantId });
    if (!grant) return res.status(404).json({ success: false, message: 'Grant not found' });

    // Authorization check
    if (req.user.role === 'subrecipient') {
      const isAssigned = await require('../models').GrantAssignment.findOne({ grantId, userId: req.user.id });
      if (!isAssigned) return res.status(403).json({ success: false, message: 'Not authorized to generate proposals for this grant' });
    }

    const historicalProposals = await HistoricalGrant.find({
      $or: [
        { grantor: grant.agency },
        { title: { $regex: grant.title.split(' ')[0], $options: 'i' } }
      ]
    }).limit(3);
    const activeFunds = await Fund.find({ grantId });

    const context = {
      grant: {
        title: grant.title,
        agency: grant.agency,
        purpose: grant.purpose,
        summary: grant.summary,
        amount: grant.amount,
        eligibility: grant.eligibilityShort
      },
      historicalReferences: historicalProposals.map(p => ({ title: p.title, content: p.content })),
      financialContext: activeFunds.map(f => ({ category: f.category, allocated: f.allocatedAmount }))
    };

    const systemMsg = `You are an Expert Grant Writer specializing in the transportation sector.
    Your goal is to write a comprehensive, professional grant proposal for the specified grant using the provided context and historical best practices.
    
    CONTEXT: ${JSON.stringify(context)}
    
    STRUCTURE YOUR RESPONSE AS A JSON OBJECT WITH THESE SECTIONS:
    {
      "executiveSummary": "Compelling summary of the proposal",
      "projectDescription": "Detailed overview of the project and its goals",
      "budgetNarrative": "Justification for requested funds based on financial context",
      "impact": "Measurable community and sector outcomes",
      "implementationPlan": "Step-by-step phases of the project"
    }
    
    GUIDELINES:
    - Use professional, formal language.
    - Be specific and cite data points from the grant description where possible.
    - Ensure alignment between proposed activities and original grant purpose.
    - Respond ONLY with the JSON object.`;

    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    console.log('🚀 [AI] Generating Full Proposal...');

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: systemMsg }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: "json_object" }
    });

    const generatedContent = JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");

    // 2. Save as a new Proposal Draft
    const proposal = await Proposal.create({
      id: require('crypto').randomUUID(),
      grantId,
      userId: req.user.id,
      title: `Generated Proposal: ${grant.title}`,
      content: generatedContent,
      status: 'Draft'
    });

    res.status(201).json({
      success: true,
      message: 'Full proposal generated successfully',
      data: proposal
    });

  } catch (error) {
    console.error('❌ [AI Generation] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate autonomous proposal', error: error.message });
  }
};

/**
 * @route   POST /api/ai/analyze-compliance
 * @desc    Analyze grant text and automatically generate compliance checkpoints
 * @access  Private
 */
const analyzeComplianceRequirements = async (req, res, next) => {
  try {
    console.log('📬 [API] Received request to /analyze-compliance with body:', req.body);
    const { grantId } = req.body;
    if (!grantId) return res.status(400).json({ success: false, message: 'Grant ID is required' });

    const grant = await Grant.findOne({ id: grantId });
    if (!grant) return res.status(404).json({ success: false, message: 'Grant not found' });

    // Authorization check
    if (req.user.role === 'subrecipient') {
      const isAssigned = await require('../models').GrantAssignment.findOne({ grantId, userId: req.user.id });
      if (!isAssigned) return res.status(403).json({ success: false, message: 'Not authorized to analyze compliance for this grant' });
    }

    const systemMsg = `You are a Grant Compliance Expert. Extract a checklist of EXACTLY what documents, milestones, or vendor checkpoints are required based on this grant's eligibility and purpose text.
    Return ONLY a JSON object with a "checkpoints" array. Structure:
    {
      "checkpoints": [
        { "title": "Short Document/Milestone Title", "description": "Specific details", "dueDate": "2026-06-01" }
      ]
    }
    Use dates around 1-3 months from now.
    
    Grant Purpose: ${grant.purpose}
    Grant Eligibility: ${grant.eligibilityShort?.join(', ') || 'Standard entity documents required'}`;

    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: systemMsg }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(chatCompletion.choices[0]?.message?.content || '{"checkpoints":[]}');
    const items = parsed.checkpoints || [];

    const checkpoints = items.map(cp => ({
      id: require('crypto').randomUUID(),
      grantId,
      title: cp.title || 'Required Document',
      description: cp.description || 'Provide necessary documentation.',
      dueDate: cp.dueDate ? new Date(cp.dueDate) : new Date(Date.now() + 30*24*60*60*1000),
      status: 'Open'
    }));

    if (checkpoints.length > 0) {
      await ComplianceCheckpoint.insertMany(checkpoints);
    }

    res.json({ success: true, count: checkpoints.length, data: checkpoints });
  } catch (error) {
    console.error('❌ [AI] Compliance Analysis Error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze compliance requirements' });
  }
};

/**
 * @route   GET /api/ai/proposals
 * @desc    Get user-saved proposal drafts
 * @access  Private
 */
const getSavedProposals = async (req, res, next) => {
  try {
    const filter = { isHistorical: false };
    if (req.user.role === 'subrecipient') {
      filter.userId = req.user.id;
    }

    const proposals = await Proposal.find(filter)
      .populate('grant', 'title agency')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      count: proposals.length,
      data: proposals
    });
  } catch (error) {
    console.error('❌ [AI Proposals] Fetch Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch saved proposals', error: error.message });
  }
};

module.exports = { suggestGrants, saveProposal, suggestContextual, generateFullProposal, analyzeComplianceRequirements, getSavedProposals };
