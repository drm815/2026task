import { useState, useEffect } from 'react';
import './StudentPortal.css';

const GAS_URL = '/api/gas';

// ── 객관식 제출 UI ───────────────────────────────────────────────────
const MultipleChoiceSubmit = ({ questions, answers, onChange }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {questions.map((q, qi) => (
            <div key={qi} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.75rem' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{qi + 1}. {q.question}</p>
                {q.options.map((opt, oi) => (
                    <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name={`q-${qi}`}
                            checked={answers[qi] === oi}
                            onChange={() => {
                                const next = { ...answers, [qi]: oi };
                                onChange(next);
                            }}
                        />
                        {oi + 1}. {opt}
                    </label>
                ))}
            </div>
        ))}
    </div>
);

// ── 주관식/서답형 제출 UI ────────────────────────────────────────────
const ShortAnswerSubmit = ({ questions, answers, onChange }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {questions.map((q, qi) => (
            <div key={qi}>
                <p style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{qi + 1}. {q.question}</p>
                <textarea
                    placeholder="답을 입력하세요"
                    value={answers[qi] || ''}
                    onChange={e => onChange({ ...answers, [qi]: e.target.value })}
                    style={{ width: '100%', minHeight: '80px', padding: '0.5rem', boxSizing: 'border-box' }}
                />
            </div>
        ))}
    </div>
);

// ── 메인 학생 포털 ───────────────────────────────────────────────────
const StudentPortal = () => {
    const [studentInfo, setStudentInfo] = useState({ grade: '', class: '', number: '', name: '' });
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [assessments, setAssessments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(null); // assessment ID
    const [answers, setAnswers] = useState({});         // { questionIndex: value }
    const [file, setFile] = useState(null);
    const [submitMsg, setSubmitMsg] = useState('');
    const [myScores, setMyScores] = useState([]);

    useEffect(() => {
        if (!isLoggedIn) return;
        const { grade, class: cls, number, name } = studentInfo;
        const fetchAssessments = async () => {
            setIsLoading(true); setError('');
            try {
                const res = await fetch(`${GAS_URL}?action=getAssessments`);
                const data = await res.json();
                setAssessments(Array.isArray(data) ? data.filter(a => {
                    if (!a.IsPublic) return false;
                    if (!a.Grades || String(a.Grades).trim() === '') return true;
                    return String(a.Grades).split(',').map(g => g.trim()).includes(String(grade));
                }) : []);
            } catch { setError('평가 목록을 불러오지 못했습니다.'); }
            finally { setIsLoading(false); }
        };
        const fetchMyScores = async () => {
            try {
                const params = new URLSearchParams({ action: 'getMyScores', grade, class: cls, number, name });
                const res = await fetch(`${GAS_URL}?${params}`);
                const data = await res.json();
                setMyScores(Array.isArray(data) ? data : []);
            } catch {}
        };
        fetchAssessments();
        fetchMyScores();
    }, [isLoggedIn]);

    const handleLogin = (e) => {
        e.preventDefault();
        if (studentInfo.grade && studentInfo.class && studentInfo.number && studentInfo.name)
            setIsLoggedIn(true);
    };

    const openSubmit = (item) => {
        setSubmitting(item.ID);
        setAnswers({});
        setFile(null);
        setSubmitMsg('');
    };

    const handleSubmit = async (item) => {
        setSubmitMsg('');
        const { grade, class: cls, number, name } = studentInfo;

        if (item.Type === '파일 업로드') {
            if (!file) { setSubmitMsg('파일을 선택해주세요.'); return; }
            setSubmitMsg('업로드 중...');
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const base64 = ev.target.result.split(',')[1];
                const ext = file.name.substring(file.name.lastIndexOf('.'));
                try {
                    const res = await fetch(GAS_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'submitAssignment',
                            grade, class: cls, number, name,
                            assessmentID: item.ID,
                            content: '',
                            fileName: `${grade}-${cls}-${number}-${name}${ext}`,
                            fileData: base64,
                            mimeType: file.type,
                        }),
                    });
                    const data = await res.json();
                    if (data.status === 'success') { setSubmitMsg('제출 완료!'); setSubmitting(null); }
                    else setSubmitMsg(data.message || '제출 실패');
                } catch { setSubmitMsg('서버 오류'); }
            };
            reader.readAsDataURL(file);
            return;
        }

        // 객관식: 자동 채점용 answers JSON
        // 주관식/서답형: 답변 텍스트
        let content = '';
        if (item.Type === '객관식') {
            let questions = [];
            try { questions = JSON.parse(item.Questions || '[]'); } catch {}
            content = JSON.stringify(answers);
        } else {
            // 주관식/서답형: 각 답 합치기
            const qs = (() => { try { return JSON.parse(item.Questions || '[]'); } catch { return []; } })();
            content = qs.map((q, i) => `${i + 1}. ${q.question}\n답: ${answers[i] || ''}`).join('\n\n');
        }

        try {
            const params = new URLSearchParams({ action: 'submitAssignment', grade, class: cls, number, name, assessmentID: item.ID, content });
            const res = await fetch(`${GAS_URL}?${params}`);
            const data = await res.json();
            if (data.status === 'success') {
                // 객관식이면 자동 채점 결과 표시
                if (item.Type === '객관식' && data.autoScore !== undefined) {
                    setSubmitMsg(`제출 완료! 자동 채점 결과: ${data.autoScore}점`);
                } else {
                    setSubmitMsg('제출 완료!');
                }
                setSubmitting(null);
            } else {
                setSubmitMsg(data.message || '제출 실패');
            }
        } catch { setSubmitMsg('서버 오류'); }
    };

    if (!isLoggedIn) {
        return (
            <div className="login-container fade-in">
                <div className="glass-card login-box">
                    <h2>학생 본인 확인</h2>
                    <p>수행평가 제출을 위해 정보를 입력해주세요.</p>
                    <form onSubmit={handleLogin} className="input-group">
                        <div className="row">
                            <input type="number" placeholder="학년" required value={studentInfo.grade} onChange={e => setStudentInfo({ ...studentInfo, grade: e.target.value })} />
                            <input type="number" placeholder="반" required value={studentInfo.class} onChange={e => setStudentInfo({ ...studentInfo, class: e.target.value })} />
                        </div>
                        <div className="row">
                            <input type="number" placeholder="번호" required value={studentInfo.number} onChange={e => setStudentInfo({ ...studentInfo, number: e.target.value })} />
                            <input type="text" placeholder="이름" required value={studentInfo.name} onChange={e => setStudentInfo({ ...studentInfo, name: e.target.value })} />
                        </div>
                        <button type="submit" className="btn-primary w-full">확인</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="student-portal fade-in">
            <header className="portal-header">
                <h3>반갑습니다, {studentInfo.grade}학년 {studentInfo.class}반 {studentInfo.name} 학생</h3>
                <button className="btn-text" onClick={() => setIsLoggedIn(false)}>정보 수정</button>
            </header>

            {submitMsg && (
                <div style={{ margin: '0.5rem 0', padding: '0.75rem 1rem', background: submitMsg.includes('완료') ? '#e6f4ea' : '#fce8e6', borderRadius: '8px', color: submitMsg.includes('완료') ? '#188038' : '#c5221f' }}>
                    {submitMsg}
                </div>
            )}

            {myScores.length > 0 && (
                <div className="glass-card" style={{ margin: '0.5rem 0', padding: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.75rem' }}>내 점수</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #eee' }}>
                                <th style={{ textAlign: 'left', padding: '0.4rem 0.5rem' }}>평가명</th>
                                <th style={{ textAlign: 'center', padding: '0.4rem 0.5rem' }}>점수</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myScores.map((s, i) => {
                                const assessment = assessments.find(a => a.ID === s.AssessmentID);
                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                        <td style={{ padding: '0.4rem 0.5rem' }}>{assessment ? assessment.Title : s.AssessmentID}</td>
                                        <td style={{ textAlign: 'center', padding: '0.4rem 0.5rem', fontWeight: 'bold', color: '#1a73e8' }}>{s.Score}점</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="portal-content">
                <section className="assessment-grid">
                    {error && <div className="glass-card p-10 text-center"><p>{error}</p></div>}
                    {isLoading ? (
                        <div className="glass-card p-10 text-center"><p>불러오는 중...</p></div>
                    ) : assessments.length === 0 && !error ? (
                        <div className="glass-card p-10 text-center"><p>현재 진행 중인 수행평가가 없습니다.</p></div>
                    ) : (
                        assessments.map(item => {
                            const isPast = item.Deadline && new Date() > new Date(item.Deadline);
                            let questions = [];
                            try { questions = JSON.parse(item.Questions || '[]'); } catch {}
                            const isOpen = submitting === item.ID;

                            return (
                                <div key={item.ID} className="glass-card assessment-card">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        <h4 style={{ margin: 0 }}>{item.Title}</h4>
                                        {item.Type && (
                                            <span style={{ fontSize: '0.75rem', background: '#e8f4fd', color: '#1a73e8', borderRadius: '4px', padding: '2px 6px' }}>
                                                {item.Type}
                                            </span>
                                        )}
                                    </div>
                                    <p className="desc">{item.Description}</p>
                                    {item.Criteria && <p style={{ fontSize: '0.8rem', color: '#555' }}>평가 기준: {item.Criteria}</p>}
                                    {item.Deadline && (
                                        <p style={{ fontSize: '0.8rem', color: isPast ? 'red' : '#555' }}>
                                            {isPast ? '마감됨' : `제출 기한: ${new Date(item.Deadline).toLocaleString('ko-KR')}`}
                                        </p>
                                    )}

                                    {!isPast && !isOpen && (
                                        <button className="btn-outline" onClick={() => openSubmit(item)}>제출하기</button>
                                    )}
                                    {isPast && <button className="btn-outline" disabled>마감됨</button>}

                                    {isOpen && (
                                        <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                                            {item.Type === '객관식' && questions.length > 0 && (
                                                <MultipleChoiceSubmit questions={questions} answers={answers} onChange={setAnswers} />
                                            )}
                                            {(item.Type === '주관식 퀴즈' || item.Type === '서답형') && questions.length > 0 && (
                                                <ShortAnswerSubmit questions={questions} answers={answers} onChange={setAnswers} />
                                            )}
                                            {item.Type === '파일 업로드' && (
                                                <div>
                                                    <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.5rem' }}>
                                                        파일명: {studentInfo.grade}-{studentInfo.class}-{studentInfo.number}-{studentInfo.name}.확장자
                                                    </p>
                                                    <input type="file" onChange={e => setFile(e.target.files[0])} />
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                                <button className="btn-primary" onClick={() => handleSubmit(item)}>제출</button>
                                                <button className="btn-outline" onClick={() => setSubmitting(null)}>취소</button>
                                            </div>
                                            {submitMsg && <p style={{ marginTop: '0.5rem', color: submitMsg.includes('완료') ? 'green' : 'red' }}>{submitMsg}</p>}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </section>
            </div>
        </div>
    );
};

export default StudentPortal;
