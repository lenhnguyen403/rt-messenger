import axios from 'axios'

export const API = axios.create({
    // baseURL:
    //     import.meta.env.MODE === "development"
    //         ? `${import.meta.env.VITE_API_URL}/api`
    //         : "/api",
    baseURL: `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api`,
    withCredentials: true,
})