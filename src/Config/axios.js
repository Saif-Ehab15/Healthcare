import axios from "axios";

const axiosInstance = axios.create({
  baseURL: 'https://localhost:7250',
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Required for sending/receiving cookies
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || "";
    const isRefreshRequest = requestUrl.includes("/api/Accounts/RefreshToken");
    const isLoginRequest = requestUrl.includes("/api/Accounts/Login");

    // Don't attempt token refresh for non-401 errors, retried requests,
    // or auth endpoints (login/refresh themselves).
    if (
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      isRefreshRequest ||
      isLoginRequest
    ) {
      return Promise.reject(error);
    }

    const existingToken = localStorage.getItem("token");
    if (!existingToken) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      try {
        const token = await new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axiosInstance(originalRequest);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    originalRequest._retry = true;
    isRefreshing = true;

    return new Promise((resolve, reject) => {
      axios
        .post(
          `${axiosInstance.defaults.baseURL}/api/Accounts/RefreshToken`,
          {},
          { withCredentials: true }
        )
        .then(({ data }) => {
          const newToken = data.token;
          if (!newToken) {
            throw new Error("Refresh token endpoint did not return a token.");
          }
          localStorage.setItem("token", newToken);
          axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          resolve(axiosInstance(originalRequest));
        })
        .catch((err) => {
          processQueue(err, null);
          // If refresh fails, clear client auth state.
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          reject(err);
        })
        .finally(() => {
          isRefreshing = false;
        });
    });
  }
);


export default axiosInstance;