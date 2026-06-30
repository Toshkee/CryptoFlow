import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PageLoader } from '@/components/layout/PageLoader'

// Code-split routes so the heavy chart libs (lightweight-charts, recharts)
// only load on the screens that use them.
const Home = lazy(() => import('@/pages/Home'))
const Markets = lazy(() => import('@/pages/Markets'))
const CoinDetail = lazy(() => import('@/pages/CoinDetail'))
const Trade = lazy(() => import('@/pages/Trade'))
const Wallet = lazy(() => import('@/pages/Wallet'))
const Profile = lazy(() => import('@/pages/Profile'))
const SignIn = lazy(() => import('@/pages/auth/SignIn'))
const SignUp = lazy(() => import('@/pages/auth/SignUp'))
const NotFound = lazy(() => import('@/pages/NotFound'))

export default function App() {
  return (
    // reducedMotion="user" lets the OS "reduce motion" setting disable the
    // spring/layout animations (e.g. the Trade interval pill); CSS animations
    // are handled separately in globals.css.
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<PageLoader />}>
                <Home />
              </Suspense>
            }
          />
          <Route
            path="/markets"
            element={
              <Suspense fallback={<PageLoader />}>
                <Markets />
              </Suspense>
            }
          />
          <Route
            path="/coin/:coin_id"
            element={
              <Suspense fallback={<PageLoader />}>
                <CoinDetail />
              </Suspense>
            }
          />

          <Route element={<ProtectedRoute />}>
            <Route
              path="/trade"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Trade />
                </Suspense>
              }
            />
            <Route
              path="/wallet"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Wallet />
                </Suspense>
              }
            />
            <Route
              path="/profile"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Profile />
                </Suspense>
              }
            />
          </Route>

          <Route
            path="/signin"
            element={
              <Suspense fallback={<PageLoader />}>
                <SignIn />
              </Suspense>
            }
          />
          <Route
            path="/signup"
            element={
              <Suspense fallback={<PageLoader />}>
                <SignUp />
              </Suspense>
            }
          />
          <Route
            path="*"
            element={
              <Suspense fallback={<PageLoader />}>
                <NotFound />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </MotionConfig>
  )
}
