import { useState } from 'react';

const FormInput = ({ label, type = 'text', value, onChange, placeholder, required = false, name, error, icon: Icon, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative mb-5 w-full">
      <div
        className={`relative rounded-xl border-2 transition-all duration-300 w-full overflow-hidden
          ${error ? 'border-red-400 bg-red-50' : 
            isFocused ? 'border-primary-500 bg-primary-50/10 shadow-sm shadow-primary-500/20' : 
            'border-surface-200 bg-white hover:border-surface-300'
          }`}
      >
        {Icon && (
          <Icon className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${isFocused ? 'text-primary-500' : 'text-gray-400'} ${error ? 'text-red-400' : ''}`} />
        )}
        
        <label
          className={`absolute transition-all duration-300 pointer-events-none
            ${Icon ? 'left-10' : 'left-4'}
            ${(isFocused || value) 
              ? `top-1.5 text-xs font-semibold ${error ? 'text-red-500' : 'text-primary-600'}` 
              : `top-3.5 text-sm ${error ? 'text-red-400' : 'text-gray-400'}`
            }
          `}
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full bg-transparent outline-none pt-6 pb-2 text-gray-800 text-sm placeholder-transparent transition-colors ${Icon ? 'pl-10 pr-4' : 'px-4'}`}
          placeholder={label}
          required={required}
          {...props}
        />
      </div>
      
      {error && (
        <span className="text-xs text-red-500 mt-1 ml-1 font-medium select-none absolute -bottom-5 left-0">
          {error}
        </span>
      )}
    </div>
  );
};

export default FormInput;
