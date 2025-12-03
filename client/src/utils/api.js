import axios from 'axios';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const apiUrl = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:5000/api' : 'https://api-werk.kaumtech.com/api');

console.log('Werk App API Config:', {
    hostname: window.location.hostname,
    isLocal,
    envApiUrl: import.meta.env.VITE_API_URL,
    finalApiUrl: apiUrl
});

const api = axios.create({
    baseURL: apiUrl,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
