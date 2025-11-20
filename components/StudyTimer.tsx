
import React, { useState, useEffect, useCallback, useRef } from 'react';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import ResetIcon from './icons/ResetIcon';

const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;

const StudyTimer: React.FC = () => {
    const [minutes, setMinutes] = useState(WORK_MINUTES);
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [isWorkSession, setIsWorkSession] = useState(true);
    const [cycles, setCycles] = useState(0);

    const timerRef = useRef<number | null>(null);

    const resetTimer = useCallback((work = true) => {
        setIsActive(false);
        setIsWorkSession(work);
        setMinutes(work ? WORK_MINUTES : BREAK_MINUTES);
        setSeconds(0);
    }, []);

    useEffect(() => {
        if (isActive) {
            timerRef.current = window.setInterval(() => {
                if (seconds > 0) {
                    setSeconds(s => s - 1);
                } else if (minutes > 0) {
                    setMinutes(m => m - 1);
                    setSeconds(59);
                } else {
                    // Timer finished
                    if (isWorkSession) {
                        setCycles(c => c + 1);
                        alert("Work session complete! Time for a break.");
                        resetTimer(false);
                    } else {
                        alert("Break's over! Back to work.");
                        resetTimer(true);
                    }
                }
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive, seconds, minutes, isWorkSession, resetTimer]);

    const toggleTimer = () => {
        setIsActive(!isActive);
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset the timer and cycles?")) {
            resetTimer(true);
            setCycles(0);
        }
    }

    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const progress = ( ( (isWorkSession ? WORK_MINUTES : BREAK_MINUTES) * 60) - (minutes * 60 + seconds) ) / ( (isWorkSession ? WORK_MINUTES : BREAK_MINUTES) * 60) * 100;

    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8">
            <div className="relative w-80 h-80 flex items-center justify-center">
                 <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle className="text-gray-700" strokeWidth="7" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                    <circle 
                        className="text-blue-500" 
                        strokeWidth="7" 
                        strokeDasharray={2 * Math.PI * 45}
                        strokeDashoffset={(2 * Math.PI * 45) * (1 - progress / 100)}
                        strokeLinecap="round" 
                        stroke="currentColor" 
                        fill="transparent" 
                        r="45" 
                        cx="50" 
                        cy="50"
                        style={{transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s linear'}}
                    />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <h1 className="text-7xl font-mono">{formattedTime}</h1>
                    <p className={`text-xl font-semibold mt-2 px-4 py-1 rounded-full ${isWorkSession ? 'bg-red-500' : 'bg-green-500'}`}>
                        {isWorkSession ? 'Work Session' : 'Break Time'}
                    </p>
                </div>
            </div>

            <div className="flex space-x-6 mt-10">
                <button 
                    onClick={toggleTimer} 
                    className="p-4 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
                    aria-label={isActive ? 'Pause timer' : 'Start timer'}
                    >
                    {isActive ? <PauseIcon className="w-8 h-8"/> : <PlayIcon className="w-8 h-8"/>}
                </button>
                <button 
                    onClick={handleReset} 
                    className="p-4 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
                    aria-label="Reset timer"
                    >
                    <ResetIcon className="w-8 h-8"/>
                </button>
            </div>
            
            <div className="mt-8 text-lg">
                <p>Completed Cycles: <span className="font-bold text-blue-400">{cycles}</span></p>
            </div>
        </div>
    );
};

export default StudyTimer;
