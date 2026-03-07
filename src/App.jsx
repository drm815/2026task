import { useState, lazy, Suspense } from 'react'
import './App.css'

const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'))
const StudentPortal = lazy(() => import('./pages/StudentPortal'))

const preloadStudent = () => import('./pages/StudentPortal')
const preloadTeacher = () => import('./pages/TeacherDashboard')

function App() {
    const [view, setView] = useState('landing')

    return (
        <div className="app-container">
            <nav className="navbar glass-card">
                <div className="logo" onClick={() => setView('landing')}>EDU-GRADE</div>
                <div className="nav-links">
                    <button className={view === 'student' ? 'active' : ''} onClick={() => setView('student')} onMouseEnter={preloadStudent} onFocus={preloadStudent}>학생용</button>
                    <button className={view === 'teacher' ? 'active' : ''} onClick={() => setView('teacher')} onMouseEnter={preloadTeacher} onFocus={preloadTeacher}>교사용</button>
                </div>
            </nav>

            <main className="content">
                {view === 'landing' && (
                    <div className="hero-section fade-in">
                        <h1 className="hero-title">스마트 수행평가<br />채점 플랫폼</h1>
                        <p className="hero-subtitle">학년-반-번호 기반의 간편한 점수 관리 시스템</p>
                        <div className="action-buttons">
                            <button className="btn-primary" onClick={() => setView('student')} onMouseEnter={preloadStudent} onFocus={preloadStudent}>과제 제출하기</button>
                            <button className="btn-secondary" onClick={() => setView('teacher')} onMouseEnter={preloadTeacher} onFocus={preloadTeacher}>교사 관리 모드</button>
                        </div>
                    </div>
                )}

                <Suspense fallback={<div className="content" style={{ textAlign: 'center', padding: '2rem' }}>불러오는 중...</div>}>
                    {view === 'student' && <StudentPortal />}
                    {view === 'teacher' && <TeacherDashboard />}
                </Suspense>
            </main>
        </div>
    )
}

export default App
