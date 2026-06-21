import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { C } from './tokens'
import { useAuth } from './context/AuthContext'
import { useMarketDataPreload } from './hooks/useMarketDataPreload'
import { useQueuedExecution } from './hooks/useQueuedExecution'
import { GamificationProvider } from './gamification/useGamification'

import WelcomeMobile   from './screens/auth/WelcomeMobile'
import WelcomeDesktop  from './screens/auth/WelcomeDesktop'
import SignUp          from './screens/auth/SignUp'
import SignIn          from './screens/auth/SignIn'
import SignInDesktop   from './screens/auth/SignInDesktop'
import ReturningUser   from './screens/auth/ReturningUser'

import Onboarding from './screens/onboarding/Onboarding'

import PortfolioMobile  from './screens/portfolio/PortfolioMobile'
import PortfolioDesktop from './screens/portfolio/PortfolioDesktop'
import AskTab           from './screens/portfolio/AskTab'
import FindMentor       from './screens/heroes/FindMentor'

import BuyScreen    from './screens/trade/BuyScreen'
import SellScreen   from './screens/trade/SellScreen'
import TradeReceipt from './screens/trade/TradeReceipt'
import HeroHandoff  from './screens/trade/HeroHandoff'

import Markets         from './screens/markets/Markets'
import StockDetail     from './screens/markets/StockDetail'

import OrdersMobile from './screens/orders/OrdersMobile'

import AchievementsMobile from './screens/achievements/AchievementsMobile'
import Profile            from './screens/profile/Profile'
import BadgeEarned        from './screens/achievements/BadgeEarned'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function Wrapper({ children }) {
  return (
    <div style={{ minHeight:'100%', display:'flex', flexDirection:'column', alignItems:'center', background:C.paper }}>
      {children}
    </div>
  )
}

// TODO: restore auth check — temporarily open for UI testing
function PrivateRoute({ children }) {
  return children
}

// TODO: restore auth check — temporarily open for UI testing
function OnboardingRoute({ children }) {
  return children
}

export default function App() {
  const isMobile = useIsMobile()
  const { user } = useAuth()
  useMarketDataPreload(user)
  useQueuedExecution()

  return (
    <BrowserRouter>
      <GamificationProvider>
      <Wrapper>
        <Routes>
          {/* Public */}
          <Route path="/"          element={isMobile ? <WelcomeMobile/> : <WelcomeDesktop/>}/>
          <Route path="/welcome"   element={isMobile ? <WelcomeMobile/> : <WelcomeDesktop/>}/>
          <Route path="/sign-up"   element={isMobile ? <SignUp/> : <WelcomeDesktop/>}/>
          <Route path="/sign-in"   element={isMobile ? <SignIn/> : <SignInDesktop/>}/>
          <Route path="/returning" element={<ReturningUser/>}/>

          {/* Onboarding */}
          <Route path="/onboarding" element={<OnboardingRoute><Onboarding/></OnboardingRoute>}/>

          {/* Authenticated */}
          <Route path="/portfolio"    element={<PrivateRoute>{isMobile ? <PortfolioMobile/> : <PortfolioDesktop/>}</PrivateRoute>}/>
          <Route path="/ask"          element={<PrivateRoute>{isMobile ? <AskTab/> : <PortfolioDesktop/>}</PrivateRoute>}/>
          <Route path="/find-mentor"  element={<PrivateRoute><FindMentor/></PrivateRoute>}/>
          <Route path="/buy/:ticker"  element={<PrivateRoute><BuyScreen/></PrivateRoute>}/>
          <Route path="/sell/:ticker" element={<PrivateRoute><SellScreen/></PrivateRoute>}/>
          <Route path="/receipt"      element={<PrivateRoute><TradeReceipt/></PrivateRoute>}/>
          <Route path="/hero-handoff" element={<PrivateRoute><HeroHandoff/></PrivateRoute>}/>
          <Route path="/markets"      element={<PrivateRoute><Markets/></PrivateRoute>}/>
          <Route path="/stock/:ticker" element={<PrivateRoute><StockDetail/></PrivateRoute>}/>
          <Route path="/orders"       element={<PrivateRoute><OrdersMobile/></PrivateRoute>}/>
          <Route path="/achievements" element={<PrivateRoute><AchievementsMobile/></PrivateRoute>}/>
          <Route path="/badge-earned" element={<PrivateRoute><BadgeEarned/></PrivateRoute>}/>
          <Route path="/profile"      element={<PrivateRoute><Profile/></PrivateRoute>}/>
        </Routes>
      </Wrapper>
      </GamificationProvider>
    </BrowserRouter>
  )
}
