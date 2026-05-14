import { useState } from 'react';
import axiosInstance from '../../../Config/axios';
import './Register.css';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!email) {
            setError('Please enter your email.');
            return;
        }

        setIsLoading(true);

        try {
            
            const response = await axiosInstance.post('/api/Accounts/ForgetPassword', {
                email: email,
                resetLink: 'http://localhost:3000/ResetPassword'
            });

            if (response.status === 200 || response.data) {
                setMessage('A password reset link has been sent to your email.');
            }
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else if (err.response && typeof err.response.data === 'string') {
                setError(err.response.data);
            } else {
                setError('Failed to send reset link. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="split-layout-wrapper">
            <div className="layout-image-side"></div>

            <div className="register-container">
                <form className="register-form" onSubmit={handleSubmit}>
                    <h2 className="form-title">Forgot Password</h2>

                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="Enter Your Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    {message && <div style={{ color: 'green', marginBottom: '10px', fontSize: '14px', textAlign: 'center' }}>{message}</div>}
                    {error && <div style={{ color: 'red', marginBottom: '10px', fontSize: '14px', textAlign: 'center' }}>{error}</div>}

                    <button className="button" type="submit" disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>
            </div>
        </div>
    );
}
