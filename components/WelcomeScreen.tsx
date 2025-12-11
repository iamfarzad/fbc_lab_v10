/**
 * Welcome Screen
 * 
 * First-time user experience with animated name input
 * and feature highlights.
 */

import React, { useState, useCallback, useEffect } from 'react'
import { ArrowRight, Sparkles, Mic, Camera, FileText, Brain } from 'lucide-react'

interface WelcomeScreenProps {
  onComplete: (name: string) => void
  className?: string
}

const FEATURES = [
  { icon: <Mic className="w-5 h-5" />, title: 'Voice Chat', description: 'Talk naturally with AI' },
  { icon: <Camera className="w-5 h-5" />, title: 'Vision', description: 'Share your screen or camera' },
  { icon: <FileText className="w-5 h-5" />, title: 'Documents', description: 'Upload and analyze files' },
  { icon: <Brain className="w-5 h-5" />, title: 'Smart Research', description: 'Get real-time insights' },
]

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onComplete,
  className = ''
}) => {
  const [name, setName] = useState('')
  const [step, setStep] = useState<'name' | 'features' | 'done'>('name')
  const [currentFeature, setCurrentFeature] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [displayedGreeting, setDisplayedGreeting] = useState('')

  const greeting = name ? `Hello, ${name}!` : 'Hello!'

  // Typing effect for greeting
  useEffect(() => {
    if (step === 'features' && name) {
      setIsTyping(true)
      let index = 0
      const timer = setInterval(() => {
        if (index <= greeting.length) {
          setDisplayedGreeting(greeting.slice(0, index))
          index++
        } else {
          setIsTyping(false)
          clearInterval(timer)
        }
      }, 50)
      return () => clearInterval(timer)
    }
  }, [step, name, greeting])

  // Feature carousel
  useEffect(() => {
    if (step === 'features') {
      const timer = setInterval(() => {
        setCurrentFeature(f => (f + 1) % FEATURES.length)
      }, 3000)
      return () => clearInterval(timer)
    }
  }, [step])

  const handleNameSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      setStep('features')
    }
  }, [name])

  const handleStart = useCallback(() => {
    setStep('done')
    setTimeout(() => onComplete(name), 500)
  }, [name, onComplete])

  return (
    <div 
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        bg-gradient-to-br from-slate-50 via-white to-slate-100
        transition-opacity duration-500
        ${step === 'done' ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        ${className}
      `}
    >
      <div className="w-full max-w-md px-6">
        {/* Name Input Step */}
        {step === 'name' && (
          <div className="animate-fade-in-up space-y-8">
            {/* Logo/Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -inset-2 bg-orange-400/20 rounded-3xl animate-pulse" />
              </div>
            </div>

            {/* Welcome Text */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-semibold text-gray-900">
                Welcome to <span className="font-matrix">F.B/c</span>
              </h1>
              <p className="text-gray-500">
                Your AI consulting assistant
              </p>
            </div>

            {/* Name Form */}
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What should I call you?
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  autoFocus
                  className="
                    w-full px-4 py-3 rounded-xl border border-gray-200
                    focus:border-orange-400 focus:ring-2 focus:ring-orange-100
                    transition-all outline-none
                    text-lg
                  "
                />
              </div>
              <button
                type="submit"
                disabled={!name.trim()}
                className="
                  w-full py-3 rounded-xl font-medium
                  bg-gray-900 text-white
                  hover:bg-gray-800
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all
                  flex items-center justify-center gap-2
                "
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Features Step */}
        {step === 'features' && (
          <div className="animate-fade-in-up space-y-8">
            {/* Greeting */}
            <div className="text-center">
              <h1 className="text-3xl font-semibold text-gray-900 h-12">
                {displayedGreeting}
                {isTyping && <span className="animate-pulse">|</span>}
              </h1>
            </div>

            {/* Feature Carousel */}
            <div className="h-32 relative overflow-hidden">
              {FEATURES.map((feature, index) => (
                <div
                  key={index}
                  className={`
                    absolute inset-0 flex flex-col items-center justify-center
                    transition-all duration-500
                    ${index === currentFeature 
                      ? 'opacity-100 translate-y-0' 
                      : index < currentFeature 
                        ? 'opacity-0 -translate-y-8' 
                        : 'opacity-0 translate-y-8'
                    }
                  `}
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 mb-3">
                    {feature.icon}
                  </div>
                  <h3 className="font-medium text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-500">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Feature Dots */}
            <div className="flex justify-center gap-2">
              {FEATURES.map((_, index) => (
                <div
                  key={index}
                  className={`
                    w-1.5 h-1.5 rounded-full transition-all
                    ${index === currentFeature ? 'bg-orange-500 w-4' : 'bg-gray-300'}
                  `}
                />
              ))}
            </div>

            {/* Start Button */}
            <button
              onClick={handleStart}
              className="
                w-full py-3 rounded-xl font-medium
                bg-gradient-to-r from-orange-500 to-orange-600 text-white
                hover:from-orange-600 hover:to-orange-700
                shadow-lg shadow-orange-200
                transition-all
                flex items-center justify-center gap-2
              "
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Skip */}
            <button
              onClick={() => onComplete(name)}
              className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip introduction
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default WelcomeScreen

