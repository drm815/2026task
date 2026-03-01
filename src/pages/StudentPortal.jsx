import { useState, useEffect } from 'react';
import './StudentPortal.css';

const GAS_URL = '/api/gas';

// 참고 이미지 표시 컴포넌트 (refimg:// → GAS에서 data URL 조회)
const RefImage = ({ url }) => {
    const [src, setSrc] = useState('');
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (!url) return;
        if (url.startsWith('refimg://')) {
            const imgId = url.replace('refimg://', '');
            setLoading(true);
            fetch(`${GAS_URL}?action=getRefImage&imgId=${encodeURIComponent(imgId)}`)
                .then(r => r.json())
                .then(d => { if (d.status === 'success') setSrc(d.dataUrl); })
                .catch(() => {})
                .finally(() => setLoading(false));
        } else if (url.startsWith('data:')) {
            setSrc(url);
        }
    }, [url]);
    if (loading) return <p style={{ fontSize: '0.8rem', color: '#aaa' }}>이미지 로딩 중...</p>;
    if (!src) return null;
    return <img src={src} alt="참고 이미지" style={{ maxWidth: '100%', borderRadius: '6px', border: '1px solid #ddd' }} />;
};

// ── 마감 D-day 뱃지 ─────────────────────────────────────────────────
const DeadlineBadge = ({ deadline, isPast }) => {
    if (!deadline) return null;
    if (isPast) return null; // 카드에서 이미 마감됨 표시
    const diffMs = new Date(deadline) - new Date();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 3) return null;
    const label = diffDays <= 0 ? 'D-day' : `D-${diffDays}`;
    return (
        <span style={{ fontSize: '0.75rem', color: '#fff', background: '#f57c00', borderRadius: '4px', padding: '2px 6px' }}>
            {label}
        </span>
    );
};

// ── 객관식 제출 UI ───────────────────────────────────────────────────
const MultipleChoiceSubmit = ({ questions, answers, onChange }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {questions.map((q, qi) => (
            <div key={qi} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.75rem' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {qi + 1}. {q.question}
                    {q.score ? <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: '0.5rem' }}>({q.score}점)</span> : null}
                </p>
                {q.options.map((opt, oi) => (
                    <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name={`q-${qi}`}
                            checked={answers[qi] === oi}
                            onChange={() => onChange({ ...answers, [qi]: oi })}
                        />
                        {oi + 1}. {opt}
                    </label>
                ))}
            </div>
        ))}
    </div>
);

// ── 주관식/서답형 제출 UI (답만 입력) ────────────────────────────────
const ShortAnswerSubmit = ({ questions, answers, onChange }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {questions.map((q, qi) => (
            <div key={qi}>
                <textarea
                    placeholder={`${qi + 1}번 답을 입력하세요`}
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
    // 단계: 'login' → 'code' → 'portal'
    const [step, setStep] = useState('login');
    const [studentInfo, setStudentInfo] = useState({ grade: '', class: '', number: '', name: '' });
    const [studentCode, setStudentCode] = useState(''); // 인증된 코드
    const [codeInput, setCodeInput] = useState('');
    const [codeError, setCodeError] = useState('');
    const [newCodeNotice, setNewCodeNotice] = useState(''); // 신규 발급 코드 안내

    const [assessments, setAssessments] = useState([]);
    const [submittedIDs, setSubmittedIDs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(null);
    const [answers, setAnswers] = useState({});
    const [file, setFile] = useState(null);
    const [submitMsg, setSubmitMsg] = useState('');

    // 점수 조회
    const [myScores, setMyScores] = useState([]);
    const [scoresLoaded, setScoresLoaded] = useState(false);

    // 코드 인증 성공 후 데이터 로드
    useEffect(() => {
        if (step !== 'portal') return;
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

        const fetchMySubmissions = async () => {
            try {
                const params = new URLSearchParams({ action: 'getMySubmissions', grade, class: cls, number, name });
                const res = await fetch(`${GAS_URL}?${params}`);
                const data = await res.json();
                setSubmittedIDs(Array.isArray(data) ? data : []);
            } catch {}
        };

        const fetchMyScores = async () => {
            try {
                const params = new URLSearchParams({ action: 'getMyScores', grade, class: cls, number, name, code: studentCode });
                const res = await fetch(`${GAS_URL}?${params}`);
                const data = await res.json();
                setMyScores(Array.isArray(data) ? data : []);
                setScoresLoaded(true);
            } catch {}
        };

        fetchAssessments();
        fetchMySubmissions();
        fetchMyScores();
    }, [step]);

    // 1단계: 학번+이름 입력
    const handleLogin = (e) => {
        e.preventDefault();
        if (studentInfo.grade && studentInfo.class && studentInfo.number && studentInfo.name)
            setStep('code');
    };

    // 2단계: 코드 인증
    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setCodeError('');
        const { grade, class: cls, number, name } = studentInfo;
        try {
            const params = new URLSearchParams({ action: 'verifyStudentCode', grade, class: cls, number, name, code: codeInput });
            const res = await fetch(`${GAS_URL}?${params}`);
            const data = await res.json();
            if (data.status === 'success') {
                setStudentCode(codeInput);
                setStep('portal');
            } else {
                setCodeError(data.message || '코드가 올바르지 않습니다.');
            }
        } catch { setCodeError('서버 오류가 발생했습니다.'); }
    };

    // 코드 발급 요청
    const handleIssueCode = async () => {
        setCodeError('');
        setNewCodeNotice('');
        const { grade, class: cls, number, name } = studentInfo;
        try {
            const params = new URLSearchParams({ action: 'issueStudentCode', grade, class: cls, number, name });
            const res = await fetch(`${GAS_URL}?${params}`);
            const data = await res.json();
            if (data.status === 'success') {
                if (data.isNew && data.code) {
                    // 최초 발급 - 코드 1회 표시
                    setNewCodeNotice(data.code);
                } else {
                    // 이미 발급된 코드 있음
                    setCodeError('이미 발급된 코드가 있습니다. 선생님께 문의하세요.');
                }
            } else {
                setCodeError('코드 발급에 실패했습니다. 선생님께 문의하세요.');
            }
        } catch { setCodeError('서버 오류가 발생했습니다.'); }
    };

    // 제출 처리
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
                            code: studentCode,
                        }),
                    });
                    const data = await res.json();
                    if (data.status === 'success') {
                        setSubmitMsg('제출 완료!');
                        setSubmitting(null);
                        setSubmittedIDs(prev => [...prev.filter(id => id !== item.ID), item.ID]);
                    } else setSubmitMsg(data.message || '제출 실패');
                } catch { setSubmitMsg('서버 오류'); }
            };
            reader.readAsDataURL(file);
            return;
        }

        let content = '';
        if (item.Type === '객관식') {
            content = JSON.stringify(answers);
        } else {
            const qs = (() => { try { return JSON.parse(item.Questions || '[]'); } catch { return []; } })();
            if (qs.length > 0) {
                content = qs.map((q, i) => `${i + 1}. ${q.question}\n답: ${answers[i] || ''}`).join('\n\n');
            } else {
                content = answers[0] || '';
            }
        }

        try {
            const params = new URLSearchParams({ action: 'submitAssignment', grade, class: cls, number, name, assessmentID: item.ID, content, code: studentCode });
            const res = await fetch(`${GAS_URL}?${params}`);
            const data = await res.json();
            if (data.status === 'success') {
                if (item.Type === '객관식' && data.autoScore !== undefined) {
                    setSubmitMsg(`제출 완료! 자동 채점 결과: ${data.autoScore}점`);
                } else {
                    setSubmitMsg('제출 완료!');
                }
                setSubmitting(null);
                setSubmittedIDs(prev => [...prev.filter(id => id !== item.ID), item.ID]);
            } else {
                setSubmitMsg(data.message || '제출 실패');
            }
        } catch { setSubmitMsg('서버 오류'); }
    };

    const openSubmit = (item) => {
        setSubmitting(item.ID);
        setAnswers({});
        setFile(null);
        setSubmitMsg('');
    };

    const resetAll = () => {
        setStep('login');
        setStudentCode('');
        setCodeInput('');
        setCodeError('');
        setNewCodeNotice('');
        setMyScores([]);
        setScoresLoaded(false);
        setSubmittedIDs([]);
        setAssessments([]);
    };

    // ── 1단계: 로그인 ───────────────────────────────────────────────
    if (step === 'login') {
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
                        <button type="submit" className="btn-primary w-full">다음</button>
                    </form>
                </div>
            </div>
        );
    }

    // ── 2단계: 코드 인증 ────────────────────────────────────────────
    if (step === 'code') {
        return (
            <div className="login-container fade-in">
                <div className="glass-card login-box">
                    <h2>본인 확인 코드</h2>
                    <p style={{ color: '#555', fontSize: '0.9rem' }}>
                        {studentInfo.grade}학년 {studentInfo.class}반 {studentInfo.number}번 {studentInfo.name}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#777', margin: '0.25rem 0 1rem' }}>
                        선생님께 받은 4자리 코드를 입력하세요.
                    </p>
                    <form onSubmit={handleVerifyCode} className="input-group">
                        <input
                            type="text"
                            placeholder="4자리 코드"
                            maxLength={4}
                            value={codeInput}
                            onChange={e => setCodeInput(e.target.value.replace(/\D/g, ''))}
                            style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                            autoFocus
                        />
                        {codeError && <p style={{ color: 'red', fontSize: '0.85rem', margin: 0 }}>{codeError}</p>}
                        {newCodeNotice && (
                            <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                                <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', color: '#2e7d32' }}>코드가 발급되었습니다. 이 코드는 다시 확인할 수 없으니 기억해두세요.</p>
                                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', letterSpacing: '0.5rem', color: '#1b5e20' }}>{newCodeNotice}</p>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#555' }}>위 입력란에 입력하세요.</p>
                            </div>
                        )}
                        <button type="submit" className="btn-primary w-full">확인</button>
                    </form>
                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>코드를 받지 못했나요?</p>
                        <button className="btn-text" onClick={handleIssueCode}>코드 발급 요청</button>
                    </div>
                    <button className="btn-text" style={{ marginTop: '0.75rem', display: 'block', width: '100%' }} onClick={() => setStep('login')}>← 뒤로</button>
                </div>
            </div>
        );
    }

    // ── 3단계: 포털 메인 ────────────────────────────────────────────
    return (
        <div className="student-portal fade-in">
            <header className="portal-header">
                <h3>반갑습니다, {studentInfo.grade}학년 {studentInfo.class}반 {studentInfo.name} 학생</h3>
                <button className="btn-text" onClick={resetAll}>정보 수정</button>
            </header>

            {submitMsg && (
                <div style={{ margin: '0.5rem 0', padding: '0.75rem 1rem', background: submitMsg.includes('완료') ? '#e6f4ea' : '#fce8e6', borderRadius: '8px', color: submitMsg.includes('완료') ? '#188038' : '#c5221f' }}>
                    {submitMsg}
                </div>
            )}

            {/* 내 점수 */}
            {scoresLoaded && (
                <div className="glass-card" style={{ margin: '0.5rem 0', padding: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.75rem' }}>내 점수</h4>
                    {myScores.length === 0 ? (
                        <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>공개된 점수가 없습니다.</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #eee' }}>
                                    <th style={{ textAlign: 'left', padding: '0.4rem 0.5rem' }}>평가명</th>
                                    <th style={{ textAlign: 'center', padding: '0.4rem 0.5rem' }}>점수</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myScores.map((s, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                        <td style={{ padding: '0.4rem 0.5rem' }}>{s.AssessmentTitle || '(삭제된 평가)'}</td>
                                        <td style={{ textAlign: 'center', padding: '0.4rem 0.5rem', fontWeight: 'bold', color: '#1a73e8' }}>{s.Score}점</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
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
                            const isSubmitted = submittedIDs.includes(String(item.ID));
                            let questions = [];
                            try { questions = JSON.parse(item.Questions || '[]'); } catch {}
                            const isOpen = submitting === item.ID;

                            return (
                                <div key={item.ID} className="glass-card assessment-card">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                        <h4 style={{ margin: 0 }}>{item.Title}</h4>
                                        {item.Type && (
                                            <span style={{ fontSize: '0.75rem', background: '#e8f4fd', color: '#1a73e8', borderRadius: '4px', padding: '2px 6px' }}>
                                                {item.Type}
                                            </span>
                                        )}
                                        {isSubmitted && (
                                            <span style={{ fontSize: '0.75rem', background: '#e6f4ea', color: '#188038', borderRadius: '4px', padding: '2px 6px' }}>
                                                제출 완료
                                            </span>
                                        )}
                                        <DeadlineBadge deadline={item.Deadline} isPast={isPast} />
                                    </div>

                                    {(item.Type === '주관식 퀴즈' || item.Type === '서답형') && questions.length > 0 && (
                                        <div style={{ margin: '0.5rem 0', padding: '0.5rem 0.75rem', background: '#f8f9fa', borderRadius: '6px', fontSize: '0.85rem' }}>
                                            {questions.map((q, qi) => (
                                                <p key={qi} style={{ margin: '0.2rem 0', color: '#333' }}>{qi + 1}. {q.question}</p>
                                            ))}
                                        </div>
                                    )}

                                    <p className="desc">{item.Description}</p>
                                    {item.Criteria && <p style={{ fontSize: '0.8rem', color: '#555' }}>평가 기준: {item.Criteria}</p>}
                                    {item.Deadline && (
                                        <p style={{ fontSize: '0.8rem', color: isPast ? 'red' : '#555' }}>
                                            {isPast ? '마감됨' : `제출 기한: ${new Date(item.Deadline).toLocaleString('ko-KR')}`}
                                        </p>
                                    )}

                                    {!isPast && !isOpen && (
                                        <button className="btn-outline" onClick={() => openSubmit(item)}>
                                            {isSubmitted ? '다시 제출하기' : '제출하기'}
                                        </button>
                                    )}
                                    {isPast && <button className="btn-outline" disabled>마감됨</button>}

                                    {isOpen && (
                                        <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                                            {/* 참고자료 표시 */}
                                            {(item.RefText || item.RefImageUrl) && (
                                                <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fffde7', border: '1px solid #ffe082', borderRadius: '8px' }}>
                                                    <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#f57f17', margin: '0 0 0.5rem' }}>참고 자료</p>
                                                    {item.RefText && (
                                                        <p style={{ fontSize: '0.9rem', color: '#333', margin: '0 0 0.5rem', whiteSpace: 'pre-wrap' }}>{item.RefText}</p>
                                                    )}
                                                    {item.RefImageUrl && (
                                                        <RefImage url={item.RefImageUrl} />
                                                    )}
                                                </div>
                                            )}
                                            {item.Type === '객관식' && questions.length > 0 && (
                                                <MultipleChoiceSubmit questions={questions} answers={answers} onChange={setAnswers} />
                                            )}
                                            {(item.Type === '주관식 퀴즈' || item.Type === '서답형') && (
                                                questions.length > 0
                                                    ? <ShortAnswerSubmit questions={questions} answers={answers} onChange={setAnswers} />
                                                    : <textarea
                                                        placeholder="답을 입력하세요"
                                                        value={answers[0] || ''}
                                                        onChange={e => setAnswers({ ...answers, 0: e.target.value })}
                                                        style={{ width: '100%', minHeight: '120px', padding: '0.5rem', boxSizing: 'border-box' }}
                                                    />
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
