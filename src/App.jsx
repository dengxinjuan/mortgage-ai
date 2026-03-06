import { useState } from 'react'
import './index.css'
import MortgageForm from './components/MortgageForm'
import VoicePage from './components/VoicePage'

function App() {
  const [step, setStep]         = useState('form') // 'form' | 'chat'
  const [userData, setUserData] = useState(null)

  function handleFormSubmit(data) {
    setUserData(data)
    setStep('chat')
  }

  return (
    <>
      {step === 'form' && <MortgageForm onSubmit={handleFormSubmit} />}
      {step === 'chat' && <VoicePage userData={userData} onBack={() => setStep('form')} />}
    </>
  )
}

export default App
