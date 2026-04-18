// General Utility Functions

// Form Validation
export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validatePassword = (password) => {
  return password && password.length >= 8;
};

export const validateForm = (fields) => {
  const errors = {};
  for (const [name, { value, validator }] of Object.entries(fields)) {
    if (validator && !validator(value)) {
      errors[name] = `Invalid ${name}`;
    }
  }
  return Object.keys(errors).length === 0 ? null : errors;
};

// DOM Helpers
export const getElementById = (id) => document.getElementById(id);

export const querySelector = (selector) => document.querySelector(selector);

export const querySelectorAll = (selector) => document.querySelectorAll(selector);

export const addClass = (element, className) => {
  if (element) element.classList.add(className);
};

export const removeClass = (element, className) => {
  if (element) element.classList.remove(className);
};

export const toggleClass = (element, className) => {
  if (element) element.classList.toggle(className);
};

export const setText = (element, text) => {
  if (element) element.textContent = text;
};

export const setHTML = (element, html) => {
  if (element) element.innerHTML = html;
};

export const getValue = (element) => {
  return element ? element.value : null;
};

export const setValue = (element, value) => {
  if (element) element.value = value;
};

// Event Helpers
export const addEventListener = (element, event, callback) => {
  if (element) element.addEventListener(event, callback);
};

export const removeEventListener = (element, event, callback) => {
  if (element) element.removeEventListener(event, callback);
};

export const onClick = (element, callback) => {
  addEventListener(element, 'click', callback);
};

export const onSubmit = (form, callback) => {
  addEventListener(form, 'submit', (e) => {
    e.preventDefault();
    callback(e);
  });
};

// Loading & Error States
export const showLoading = (element, show = true) => {
  if (show) {
    addClass(element, 'opacity-50');
    addClass(element, 'pointer-events-none');
  } else {
    removeClass(element, 'opacity-50');
    removeClass(element, 'pointer-events-none');
  }
};

export const showError = (message) => {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'fixed top-4 right-4 bg-error text-white px-4 py-3 rounded-lg shadow-lg max-w-sm';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
};

export const showSuccess = (message) => {
  const successDiv = document.createElement('div');
  successDiv.className = 'fixed top-4 right-4 bg-secondary text-white px-4 py-3 rounded-lg shadow-lg max-w-sm';
  successDiv.textContent = message;
  document.body.appendChild(successDiv);
  
  setTimeout(() => {
    successDiv.remove();
  }, 5000);
};

// Async Helpers
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const handleAsync = async (asyncFn, onError = null) => {
  try {
    return await asyncFn();
  } catch (error) {
    console.error('Async Error:', error);
    if (onError) onError(error);
    else showError(error.message || 'An error occurred');
    throw error;
  }
};

// Formatting
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(value);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

export const formatDateTime = (date) => {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

// Storage
export const setStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const getStorage = (key) => {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : null;
};

export const removeStorage = (key) => {
  localStorage.removeItem(key);
};
