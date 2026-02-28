import { useState } from 'react'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentPortal from './pages/StudentPortal'
import './App.css'

function App() {
    const [view, setView] = useState('landing')

    return (
        <div className="app-container">
            <nav className="navbar glass-card">
                <div className="logo" onClick={() => setView('landing')}>EDU-GRADE</div>
                <div className="nav-links">
                    <button className={view === 'student' ? 'active' : ''} onClick={() => setView('student')}>학생용</button>
                    <button className={view === 'teacher' ? 'active' : ''} onClick={() => setView('teacher')}>교사용</button>
                </div>
            </nav>

            <main className="content">
                {view === 'landing' && (
                    <div className="hero-section fade-in">
                        <h1 className="hero-title">스마트 수행평가<br />채점 플랫폼</h1>
                        <p className="hero-subtitle">학년-반-번호 기반의 간편한 점수 관리 시스템</p>
                        <div className="action-buttons">
                            <button className="btn-primary" onClick={() => setView('student')}>과제 제출하기</button>
                            <button className="btn-secondary" onClick={() => setView('teacher')}>교사 관리 모드</button>
                        </div>
                    </div>
                )}

                {view === 'student' && <StudentPortal />}
                {view === 'teacher' && <TeacherDashboard />}
            </main>
        </div>
    )
}

export default App
