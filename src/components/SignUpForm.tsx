'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SignUpFormProps {
  userType: 'admin' | 'student';
}

// Validation functions
const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return { isValid: errors.length === 0, errors };
};

const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  // Valid email domains
  const validDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'edu', 'org', 'gov'];
  const domain = email.split('@')[1]?.toLowerCase();
  
  const isValidDomain = validDomains.some(validDomain => 
    domain === validDomain || domain?.endsWith('.' + validDomain)
  );
  
  if (!isValidDomain) {
    return { 
      isValid: false, 
      error: 'Please use a valid email domain (gmail.com, yahoo.com, outlook.com, .edu, .org, .gov, etc.)' 
    };
  }
  
  return { isValid: true };
};

const validateName = (name: string): { isValid: boolean; error?: string } => {
  if (name.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long' };
  }
  
  if (/\d/.test(name)) {
    return { isValid: false, error: 'Name cannot contain numbers' };
  }
  
  if (!/^[a-zA-Z\s'-]+$/.test(name)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }
  
  return { isValid: true };
};

export default function SignUpForm({ userType }: SignUpFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
    password?: string[];
  }>({});
  const router = useRouter();

  const validateForm = () => {
    const errors: typeof validationErrors = {};
    
    // Validate name
    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error;
    }
    
    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error;
    }
    
    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          name: name.trim(),
          role: userType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to create account');
        return;
      }

      if (userType === 'admin') {
        setSuccess('Admin account request submitted! Please wait for approval before signing in.');
      } else {
        setSuccess('Account created successfully! You can now sign in.');
        setTimeout(() => {
          router.push('/student/login');
        }, 2000);
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const validation = validatePassword(password);
    const strength = 5 - validation.errors.length;
    if (strength <= 1) return { label: 'Very Weak', color: 'bg-red-500' };
    if (strength <= 2) return { label: 'Weak', color: 'bg-orange-500' };
    if (strength <= 3) return { label: 'Fair', color: 'bg-yellow-500' };
    if (strength <= 4) return { label: 'Good', color: 'bg-blue-500' };
    return { label: 'Strong', color: 'bg-green-500' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 capitalize">
            {userType} Sign Up
          </h2>
          <p className="mt-2 text-gray-600">Create your account</p>
          {userType === 'admin' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Admin accounts require approval before activation
              </p>
            </div>
          )}
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                validationErrors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter your full name"
            />
            {validationErrors.name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                validationErrors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter your email"
            />
            {validationErrors.email && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                validationErrors.password ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter a strong password"
            />
            
            {password && (
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrength().color}`}
                      style={{ width: `${((5 - validatePassword(password).errors.length) / 5) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{getPasswordStrength().label}</span>
                </div>
              </div>
            )}
            
            {validationErrors.password && (
              <div className="mt-2 space-y-1">
                {validationErrors.password.map((error, index) => (
                  <p key={index} className="text-sm text-red-600">• {error}</p>
                ))}
              </div>
            )}
            
            <div className="mt-2 text-xs text-gray-500">
              <p>Password must contain:</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>At least 8 characters</li>
                <li>One uppercase letter</li>
                <li>One lowercase letter</li>
                <li>One number</li>
                <li>One special character</li>
              </ul>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <a 
              href={`/${userType}/login`} 
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Sign in
            </a>
          </p>
          <a href="/" className="text-indigo-600 hover:text-indigo-500 text-sm">
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  );
}