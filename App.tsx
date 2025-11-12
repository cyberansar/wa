
import React, { useState, useEffect, useMemo, useCallback, ChangeEvent } from 'react';
import QRCode from 'qrcode';
import { generateMessageStream, transcribeAudio } from './services/geminiService';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { WhatsAppIcon, MicrophoneIcon, GenerateIcon } from './components/icons';

type Theme = 'light' | 'dark';

const App: React.FC = () => {
    const [phoneNumber, setPhoneNumber] = useState<string>('');
    const [message, setMessage] = useState<string>('');
    const [topic, setTopic] = useState<string>('');
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [theme, setTheme] = useState<Theme>('light');

    const isValidPhoneNumber = useMemo(() => {
        const digitsOnly = phoneNumber.replace(/\D/g, '');
        return digitsOnly.length >= 7;
    }, [phoneNumber]);
    
    // Theme Management
    useEffect(() => {
        const storedTheme = localStorage.getItem('theme') as Theme | null;
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
        setTheme(initialTheme);
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    // QR Code Generation
    useEffect(() => {
        if (isValidPhoneNumber) {
            const cleanNumber = phoneNumber.replace(/\D/g, '');
            let url = `https://wa.me/${cleanNumber}`;
            if (message) {
                url += `?text=${encodeURIComponent(message)}`;
            }
            QRCode.toDataURL(url, { width: 256, margin: 2 })
                .then(setQrCodeDataUrl)
                .catch(err => {
                    console.error('QR Code generation failed:', err)
                    setQrCodeDataUrl('');
                });
        } else {
            setQrCodeDataUrl('');
        }
    }, [phoneNumber, message, isValidPhoneNumber]);

    // Handlers
    const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        const sanitized = input.replace(/[^0-9+]/g, '');
        setPhoneNumber(sanitized);
        if (error) setError(null);
    };
    
    const handleOpenChat = () => {
        if (!isValidPhoneNumber) {
            setError('Please enter a valid phone number.');
            return;
        }
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        let url = `https://wa.me/${cleanNumber}`;
        if (message) {
            url += `?text=${encodeURIComponent(message)}`;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleGenerateMessage = useCallback(async () => {
        if (!topic || isGenerating) return;

        setIsGenerating(true);
        setMessage('');
        setError(null);
        try {
            await generateMessageStream(topic, (chunk) => {
                setMessage(prev => prev + chunk);
            });
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred.');
        } finally {
            setIsGenerating(false);
        }
    }, [topic, isGenerating]);
    
    const { isRecording, startRecording } = useSpeechRecognition({
        onTranscriptionComplete: async (base64, mimeType) => {
            try {
                setError(null);
                const transcribedText = await transcribeAudio(base64, mimeType);
                setTopic(transcribedText);
            } catch (err: any) {
                setError(err.message || 'Transcription failed.');
            }
        },
        onTranscriptionError: (err) => {
            setError(err);
        }
    });

    return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-gray-100 dark:bg-gray-900 font-sans transition-colors duration-300">
            <div className="w-full max-w-md mx-auto relative">
                {/* Theme Toggle */}
                <div className="absolute top-0 right-0 -mt-12">
                    <button onClick={toggleTheme} className="p-2 rounded-full bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-900">
                       {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 space-y-6 transform transition-all duration-500 animate-fade-in-up">
                    <div className="flex flex-col items-center text-center">
                        <WhatsAppIcon />
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-2">Quick WhatsApp Chat</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Start a chat without saving the number.</p>
                    </div>

                    {/* Main Form */}
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                            <input
                                type="tel"
                                id="phone"
                                value={phoneNumber}
                                onChange={handlePhoneChange}
                                placeholder="+1 234 567 8900"
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900 dark:text-gray-100"
                            />
                        </div>

                        {/* AI Message Generator */}
                        <div className="space-y-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                             <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Generate Message with AI</label>
                             <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    id="topic"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="Message topic (e.g., a birthday wish)"
                                    className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 sm:text-sm text-gray-900 dark:text-gray-100"
                                />
                                <button
                                    onClick={startRecording}
                                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800"
                                    aria-label="Record voice for topic"
                                >
                                    <MicrophoneIcon isRecording={isRecording} />
                                </button>
                             </div>
                             <button
                                onClick={handleGenerateMessage}
                                disabled={!topic || isGenerating}
                                className="w-full flex justify-center items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors"
                             >
                                <GenerateIcon />
                                {isGenerating ? 'Generating...' : 'Generate'}
                            </button>
                        </div>
                        
                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message (Optional)</label>
                            <textarea
                                id="message"
                                rows={4}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Or type your message here..."
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900 dark:text-gray-100"
                            />
                        </div>
                    </div>
                    
                    {error && (
                        <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
                    )}

                    <button
                        onClick={handleOpenChat}
                        disabled={!isValidPhoneNumber}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 dark:disabled:bg-green-800 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 transition-colors"
                    >
                        Open Chat
                    </button>

                    {/* QR Code Display */}
                    {qrCodeDataUrl && (
                        <div className="flex flex-col items-center space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700 animate-fade-in">
                            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Or scan this QR code</h3>
                            <div className="p-2 bg-white rounded-lg shadow-md">
                                <img src={qrCodeDataUrl} alt="WhatsApp QR Code" className="w-48 h-48" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
