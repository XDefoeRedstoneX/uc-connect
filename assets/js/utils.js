// General Utility Functions
(function () {
// Form Validation
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 8;
};

const validateForm = (fields) => {
  const errors = {};
  for (const [name, { value, validator }] of Object.entries(fields)) {
    if (validator && !validator(value)) {
      errors[name] = `Invalid ${name}`;
    }
  }
  return Object.keys(errors).length === 0 ? null : errors;
};

// DOM Helpers
const getElementById = (id) => document.getElementById(id);

const querySelector = (selector) => document.querySelector(selector);

const querySelectorAll = (selector) => document.querySelectorAll(selector);

const addClass = (element, className) => {
  if (element) element.classList.add(className);
};

const removeClass = (element, className) => {
  if (element) element.classList.remove(className);
};

const toggleClass = (element, className) => {
  if (element) element.classList.toggle(className);
};

const setText = (element, text) => {
  if (element) element.textContent = text;
};

const setHTML = (element, html) => {
  if (element) element.innerHTML = html;
};

const getValue = (element) => {
  return element ? element.value : null;
};

const setValue = (element, value) => {
  if (element) element.value = value;
};

// Event Helpers
const addEventListener = (element, event, callback) => {
  if (element) element.addEventListener(event, callback);
};

const removeEventListener = (element, event, callback) => {
  if (element) element.removeEventListener(event, callback);
};

const onClick = (element, callback) => {
  addEventListener(element, 'click', callback);
};

const onSubmit = (form, callback) => {
  addEventListener(form, 'submit', (e) => {
    e.preventDefault();
    callback(e);
  });
};

// Loading & Error States
const showLoading = (element, show = true) => {
  if (show) {
    addClass(element, 'opacity-50');
    addClass(element, 'pointer-events-none');
  } else {
    removeClass(element, 'opacity-50');
    removeClass(element, 'pointer-events-none');
  }
};

const showError = (message) => {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'fixed top-4 right-4 bg-error text-white px-4 py-3 rounded-lg shadow-lg max-w-sm';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
};

const showSuccess = (message) => {
  const successDiv = document.createElement('div');
  successDiv.className = 'fixed top-4 right-4 bg-secondary text-white px-4 py-3 rounded-lg shadow-lg max-w-sm';
  successDiv.textContent = message;
  document.body.appendChild(successDiv);
  
  setTimeout(() => {
    successDiv.remove();
  }, 5000);
};

// Async Helpers
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const handleAsync = async (asyncFn, onError = null) => {
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
const formatCurrency = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(value);
};

const formatDate = (date) => {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

const formatDateTime = (date) => {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

// Storage
const setStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getStorage = (key) => {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : null;
};

const removeStorage = (key) => {
  localStorage.removeItem(key);
};

window.UCUtils = {
  validateEmail,
  validatePassword,
  validateForm,
  getElementById,
  querySelector,
  querySelectorAll,
  addClass,
  removeClass,
  toggleClass,
  setText,
  setHTML,
  getValue,
  setValue,
  addEventListener,
  removeEventListener,
  onClick,
  onSubmit,
  showLoading,
  showError,
  showSuccess,
  delay,
  handleAsync,
  formatCurrency,
  formatDate,
  formatDateTime,
  setStorage,
  getStorage,
  removeStorage,
};

window.showError = showError;
window.showSuccess = showSuccess;
})();
