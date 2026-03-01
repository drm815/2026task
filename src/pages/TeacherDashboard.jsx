import { useState, useEffect } from 'react';
import './TeacherDashboard.css';

const GAS_URL = '/api/gas';
const GRADES = [1, 2, 3];
const TYPES = ['서답형', '객관식', '주관식 퀴즈', '파일 업로드'];

// ── 객관식 문제 편집기 ──────────────────────────────────────────────
const MultipleChoiceEditor = ({ questions, onChange }) => {
    const addQuestion = () => onChange([...questions, { question: '', options: ['', '', '', ''], answer: 0, score: 1 }]);
    const removeQuestion = (qi) => onChange(questions.filter((_, i) => i !== qi));
    const updateQuestion = (qi, field, value) => {
        const qs = questions.map((q, i) => i === qi ? { ...q, [field]: value } : q);
        onChange(qs);
    };
    const updateOption = (qi, oi, value) => {
        const qs = questions.map((q, i) => {
            if (i !== qi) return q;
            const opts = q.options.map((o, j) => j === oi ? value : o);
            return { ...q, options: opts };
        });
        onChange(qs);
    };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {questions.map((q, qi) => (
                <div key={qi} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong>{qi + 1}번 문제</strong>
                        <button onClick={() => removeQuestion(qi)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
                    </div>
                    <input
                        type="text"
                        placeholder="문제를 입력하세요"
                        value={q.question}
                        onChange={e => updateQuestion(qi, 'question', e.target.value)}
                        style={{ width: '100%', marginBottom: '0.5rem', padding: '0.4rem', boxSizing: 'border-box' }}
                    />
                    {q.options.map((opt, oi) => (
                        <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <input
                                type="radio"
                                name={`answer-${qi}`}
                                checked={q.answer === oi}
                                onChange={() => updateQuestion(qi, 'answer', oi)}
                            />
                            <span style={{ minWidth: '16px' }}>{oi + 1}.</span>
                            <input
                                type="text"
                                placeholder={`보기 ${oi + 1}`}
                                value={opt}
                                onChange={e => updateOption(qi, oi, e.target.value)}
                                style={{ flex: 1, padding: '0.3rem' }}
                            />
                        </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <small style={{ color: '#888' }}>라디오 버튼으로 정답 선택</small>
                        <label style={{ fontSize: '0.8rem', color: '#555', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            배점:
                            <input
                                type="number"
                                min="1"
                                value={q.score || 1}
                                onChange={e => updateQuestion(qi, 'score', Number(e.target.value))}
                                style={{ width: '60px', padding: '0.2rem 0.3rem' }}
                            />
                            점
                        </label>
                    </div>
                </div>
            ))}
            <button onClick={addQuestion} style={{ padding: '0.4rem', cursor: 'pointer' }}>+ 문제 추가</button>
        </div>
    );
};

// ── 주관식/서답형 문제 편집기 ────────────────────────────────────────
const ShortAnswerEditor = ({ questions, onChange, type }) => {
    const addQuestion = () => onChange([...questions, { question: '' }]);
    const removeQuestion = (qi) => onChange(questions.filter((_, i) => i !== qi));
    const updateQuestion = (qi, value) => onChange(questions.map((q, i) => i === qi ? { question: value } : q));
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {questions.map((q, qi) => (
                <div key={qi} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <span style={{ minWidth: '24px', paddingTop: '0.4rem' }}>{qi + 1}.</span>
                    <textarea
                        placeholder={type === '서답형' ? '서답형 안내 문구를 입력하세요' : '주관식 문제를 입력하세요'}
                        value={q.question}
                        onChange={e => updateQuestion(qi, e.target.value)}
                        style={{ flex: 1, padding: '0.4rem', minHeight: '60px' }}
                    />
                    <button onClick={() => removeQuestion(qi)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
                </div>
            ))}
            <button onClick={addQuestion} style={{ padding: '0.4rem', cursor: 'pointer' }}>+ 문제 추가</button>
        </div>
    );
};

// ── 평가 항목 카드 ──────────────────────────────────────────────────
const AssessmentItem = ({ item, onGrade, onUpdateDeadline, onUpdate, onDelete, onToggleVisibility }) => {
    const [editingDeadline, setEditingDeadline] = useState(false);
    const [editingContent, setEditingContent] = useState(false);
    const [deadline, setDeadline] = useState(item.Deadline ? new Date(item.Deadline).toISOString().slice(0, 16) : '');

    let parsedQuestions = [];
    try { parsedQuestions = item.Questions ? JSON.parse(item.Questions) : []; } catch { }

    const [editForm, setEditForm] = useState({
        title: item.Title || '',
        description: item.Description || '',
        criteria: item.Criteria || '',
        deadline: item.Deadline ? new Date(item.Deadline).toISOString().slice(0, 16) : '',
        grades: item.Grades ? String(item.Grades).split(',').filter(Boolean) : [],
        type: item.Type || '서답형',
        questions: parsedQuestions,
    });
    const isPast = item.Deadline && new Date() > new Date(item.Deadline);

    return (
        <div className="assessment-item">
            <div className="info">
                <h4>{item.Title}</h4>
                <span className={`status-badge ${item.IsPublic ? 'public' : 'private'}`}>
                    {item.IsPublic ? '공개 중' : '비공개'}
                </span>
                {item.Type && (
                    <span style={{ fontSize: '0.75rem', background: '#e8f4fd', color: '#1a73e8', borderRadius: '4px', padding: '2px 6px', marginLeft: '0.5rem' }}>
                        {item.Type}
                    </span>
                )}
                {item.Grades && (
                    <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: '0.5rem' }}>
                        {String(item.Grades).split(',').filter(Boolean).map(g => `${g}학년`).join(' ')}
                    </span>
                )}
                {item.Deadline && (
                    <span style={{ fontSize: '0.8rem', color: isPast ? 'red' : '#555', marginLeft: '0.5rem' }}>
                        {isPast ? '마감됨' : `기한: ${new Date(item.Deadline).toLocaleString('ko-KR')}`}
                    </span>
                )}
            </div>

            {editingDeadline && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                    <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
                    <button onClick={() => { onUpdateDeadline(item.ID, deadline); setEditingDeadline(false); }}>저장</button>
                    <button onClick={() => setEditingDeadline(false)}>취소</button>
                </div>
            )}

            {editingContent && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <input type="text" placeholder="평가 제목" value={editForm.title}
                        onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                    <textarea placeholder="상세 설명" value={editForm.description}
                        onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                    <textarea placeholder="평가 기준" value={editForm.criteria}
                        onChange={e => setEditForm({ ...editForm, criteria: e.target.value })} />
                    <input type="datetime-local" value={editForm.deadline}
                        onChange={e => setEditForm({ ...editForm, deadline: e.target.value })} />
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {GRADES.map(g => (
                            <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={editForm.grades.includes(String(g))}
                                    onChange={e => {
                                        const gs = e.target.checked
                                            ? [...editForm.grades, String(g)]
                                            : editForm.grades.filter(x => x !== String(g));
                                        setEditForm({ ...editForm, grades: gs });
                                    }} />
                                {g}학년
                            </label>
                        ))}
                    </div>
                    <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value, questions: [] })}>
                        {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {editForm.type === '객관식' && (
                        <MultipleChoiceEditor questions={editForm.questions} onChange={qs => setEditForm({ ...editForm, questions: qs })} />
                    )}
                    {(editForm.type === '주관식 퀴즈' || editForm.type === '서답형') && (
                        <ShortAnswerEditor questions={editForm.questions} onChange={qs => setEditForm({ ...editForm, questions: qs })} type={editForm.type} />
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => {
                            onUpdate(item.ID, { ...editForm, grades: editForm.grades.join(','), questions: JSON.stringify(editForm.questions) });
                            setEditingContent(false);
                        }}>저장</button>
                        <button onClick={() => setEditingContent(false)}>취소</button>
                    </div>
                </div>
            )}

            <div className="actions">
                <button onClick={onGrade}>채점하기</button>
                <button
                    onClick={() => onToggleVisibility(item.ID, !item.IsPublic)}
                    style={{ background: item.IsPublic ? '#e57373' : '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.3rem 0.7rem', cursor: 'pointer' }}
                >
                    {item.IsPublic ? '비공개로 전환' : '공개하기'}
                </button>
                <button onClick={() => setEditingDeadline(v => !v)}>기한 수정</button>
                <button onClick={() => setEditingContent(v => !v)}>내용 수정</button>
                <button onClick={() => { if (window.confirm(`"${item.Title}" 평가를 삭제할까요?`)) onDelete(item.ID); }} style={{ color: 'red' }}>삭제</button>
            </div>
        </div>
    );
};

// ── 답만 추출 (서답형/주관식: "1. 문제\n답: 내용" 형식에서 답만) ────
const extractAnswers = (content) => {
    if (!content) return '-';
    const lines = content.split('\n');
    const answers = lines.filter(l => l.startsWith('답: ')).map(l => l.replace('답: ', '').trim());
    return answers.length > 0 ? answers.join(' / ') : content;
};

// ── 채점 행 ─────────────────────────────────────────────────────────
const ScoreRow = ({ submission: s, onSave, assessmentType, checked, onCheck }) => {
    const [score, setScore] = useState(s.Score || '');
    return (
        <tr>
            <td><input type="checkbox" checked={checked} onChange={e => onCheck(e.target.checked)} /></td>
            <td>{s.Grade}</td>
            <td>{s.Class}</td>
            <td>{s.Number}</td>
            <td>{s.Name}</td>
            <td className="content-cell">
                {assessmentType === '파일 업로드'
                    ? (s.FileURL ? <a href={s.FileURL} target="_blank" rel="noreferrer" className="file-link">파일 보기</a> : '-')
                    : assessmentType === '주관식 퀴즈' || assessmentType === '서답형'
                        ? extractAnswers(s.Content)
                        : s.Content}
            </td>
            <td>
                <input type="number" value={score} onChange={e => setScore(e.target.value)} className="score-input" />
            </td>
            <td><button onClick={() => onSave(s, score)} className="save-btn">저장</button></td>
            <td style={{ textAlign: 'center', color: s.IsScorePublic ? '#4caf50' : '#aaa', fontSize: '0.8rem' }}>
                {s.IsScorePublic ? '공개' : '비공개'}
            </td>
        </tr>
    );
};

// ── 메인 대시보드 ────────────────────────────────────────────────────
const TeacherDashboard = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [authError, setAuthError] = useState('');
    const [assessments, setAssessments] = useState([]);
    const [newAssessment, setNewAssessment] = useState({
        title: '', description: '', criteria: '', deadline: '', grades: [], type: '서답형', questions: [], maxScore: ''
    });
    const [submissions, setSubmissions] = useState([]);
    const [selectedAssessment, setSelectedAssessment] = useState(null);
    const [checkedRows, setCheckedRows] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isAuthenticated) return;
        fetchAssessments();
    }, [isAuthenticated]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthError('');
        try {
            const res = await fetch(`${GAS_URL}?action=verifyTeacher&password=${encodeURIComponent(passwordInput)}`);
            const data = await res.json();
            if (data.status === 'success') setIsAuthenticated(true);
            else { setAuthError(data.message || '비밀번호가 틀렸습니다.'); setPasswordInput(''); }
        } catch { setAuthError('서버 연결에 실패했습니다.'); }
    };

    if (!isAuthenticated) {
        return (
            <div className="login-container fade-in">
                <div className="glass-card login-box">
                    <h2>교사 인증</h2>
                    <p>관리자 비밀번호를 입력하세요.</p>
                    <form onSubmit={handleLogin} className="input-group">
                        <input type="password" placeholder="비밀번호" value={passwordInput}
                            onChange={e => setPasswordInput(e.target.value)} required />
                        {authError && <p style={{ color: 'red', margin: 0 }}>{authError}</p>}
                        <button type="submit" className="btn-primary w-full">확인</button>
                    </form>
                </div>
            </div>
        );
    }

    const fetchAssessments = async () => {
        setIsLoading(true); setError('');
        try {
            const res = await fetch(`${GAS_URL}?action=getAssessments`);
            const data = await res.json();
            setAssessments(Array.isArray(data) ? data : []);
        } catch { setError('평가 목록을 불러오지 못했습니다.'); }
        finally { setIsLoading(false); }
    };

    const fetchSubmissions = async (assessment) => {
        setSelectedAssessment(assessment); setSubmissions([]); setCheckedRows({});
        setIsLoading(true); setError('');
        try {
            const res = await fetch(`${GAS_URL}?action=getSubmissions`);
            const data = await res.json();
            setSubmissions(Array.isArray(data) ? data.filter(s => s.AssessmentID === assessment.ID) : []);
        } catch { setError('제출 목록을 불러오지 못했습니다.'); }
        finally { setIsLoading(false); }
    };

    const handleUpdateScore = async (submission, score) => {
        try {
            const params = new URLSearchParams({ action: 'updateScore', grade: submission.Grade, class: submission.Class, number: submission.Number, assessmentID: submission.AssessmentID, score });
            const res = await fetch(`${GAS_URL}?${params}`);
            const data = await res.json();
            if (data.status === 'success')
                setSubmissions(prev => prev.map(s => s.Number === submission.Number ? { ...s, Score: score } : s));
        } catch { setError('점수 저장에 실패했습니다.'); }
    };

    const handleUpdateDeadline = async (id, deadline) => {
        try {
            const params = new URLSearchParams({ action: 'updateDeadline', id, deadline });
            const res = await fetch(`${GAS_URL}?${params}`);
            const data = await res.json();
            if (data.status === 'success')
                setAssessments(prev => prev.map(a => a.ID === id ? { ...a, Deadline: deadline } : a));
            else setError('기한 수정에 실패했습니다.');
        } catch { setError('서버 연결에 실패했습니다.'); }
    };

    const handleUpdate = async (id, form) => {
        try {
            const params = new URLSearchParams({ action: 'updateAssessment', id, ...form });
            const res = await fetch(`${GAS_URL}?${params}`);
            const data = await res.json();
            if (data.status === 'success') await fetchAssessments();
            else setError('수정에 실패했습니다.');
        } catch { setError('서버 연결에 실패했습니다.'); }
    };

    const handleToggleVisibility = async (id, isPublic) => {
        try {
            const params = new URLSearchParams({ action: 'toggleVisibility', id, isPublic: String(isPublic) });
            const res = await fetch(`${GAS_URL}?${params}`);
            const data = await res.json();
            if (data.status === 'success')
                setAssessments(prev => prev.map(a => a.ID === id ? { ...a, IsPublic: isPublic } : a));
            else setError('공개 설정 변경에 실패했습니다.');
        } catch { setError('서버 연결에 실패했습니다.'); }
    };

    const handleBulkSetScore = async (score) => {
        const targets = submissions.filter((_, i) => checkedRows[i]);
        if (targets.length === 0) { setError('학생을 선택해주세요.'); return; }
        setError('');
        try {
            const results = await Promise.all(targets.map(async s => {
                const params = new URLSearchParams({
                    action: 'updateScore',
                    grade: String(Math.round(Number(s.Grade))),
                    class: String(Math.round(Number(s.Class))),
                    number: String(Math.round(Number(s.Number))),
                    name: s.Name,
                    assessmentID: s.AssessmentID,
                    score: String(Number(score)),
                });
                const res = await fetch(`${GAS_URL}?${params}`);
                return res.json();
            }));
            const failed = results.filter(r => r.status !== 'success');
            if (failed.length > 0) {
                setError(`일부 실패: ${failed[0].message || '알 수 없는 오류'}`);
            } else {
                const targetKeys = new Set(targets.map(s => `${s.Grade}-${s.Class}-${s.Number}`));
                setSubmissions(prev => prev.map(s =>
                    targetKeys.has(`${s.Grade}-${s.Class}-${s.Number}`) ? { ...s, Score: score } : s
                ));
                setCheckedRows({});
            }
        } catch (e) { setError('만점 부여에 실패했습니다: ' + e.message); }
    };

    const handleBulkScorePublic = async (isPublic) => {
        const targets = submissions.filter((_, i) => checkedRows[i]);
        if (targets.length === 0) return;
        try {
            await Promise.all(targets.map(s => {
                const params = new URLSearchParams({ action: 'toggleScorePublic', grade: s.Grade, class: s.Class, number: s.Number, assessmentID: s.AssessmentID, isPublic: String(isPublic) });
                return fetch(`${GAS_URL}?${params}`);
            }));
            const targetKeys = new Set(targets.map(s => `${s.Grade}-${s.Class}-${s.Number}`));
            setSubmissions(prev => prev.map(s =>
                targetKeys.has(`${s.Grade}-${s.Class}-${s.Number}`) ? { ...s, IsScorePublic: isPublic } : s
            ));
            setCheckedRows({});
        } catch { setError('점수 공개 설정에 실패했습니다.'); }
    };

    const handleDownloadCSV = async () => {
        try {
            const res = await fetch(`${GAS_URL}?action=getSubmissions`);
            const allSubs = await res.json();
            if (!Array.isArray(allSubs) || allSubs.length === 0) return;

            // 학년별 그룹핑
            const gradeGroups = {};
            allSubs.forEach(s => {
                const g = s.Grade;
                if (!gradeGroups[g]) gradeGroups[g] = {};
                const key = `${s.Class}-${s.Number}`;
                if (!gradeGroups[g][key]) gradeGroups[g][key] = { Class: s.Class, Number: s.Number, Name: s.Name, scores: {} };
                gradeGroups[g][key].scores[s.AssessmentID] = s.Score;
            });

            // 평가 제목 맵
            const assessmentMap = {};
            assessments.forEach(a => { assessmentMap[a.ID] = a.Title; });

            // 학년별 CSV 생성 및 다운로드
            Object.keys(gradeGroups).sort().forEach(grade => {
                const students = Object.values(gradeGroups[grade]).sort((a, b) => a.Class - b.Class || a.Number - b.Number);
                // 이 학년에 해당하는 평가 목록
                const gradeAssessments = assessments.filter(a => {
                    if (!a.Grades || String(a.Grades).trim() === '') return true;
                    return String(a.Grades).split(',').map(g => g.trim()).includes(String(grade));
                });
                const headers = ['반', '번호', '이름', ...gradeAssessments.map(a => a.Title)];
                const rows = students.map(s => [
                    s.Class, s.Number, s.Name,
                    ...gradeAssessments.map(a => s.scores[a.ID] ?? '')
                ]);
                const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${grade}학년_수행평가_점수.csv`;
                a.click();
                URL.revokeObjectURL(url);
            });
        } catch { setError('CSV 다운로드에 실패했습니다.'); }
    };

    const handleDelete = async (id) => {
        try {
            const params = new URLSearchParams({ action: 'deleteAssessment', id });
            const res = await fetch(`${GAS_URL}?${params}`);
            const data = await res.json();
            if (data.status === 'success') {
                setAssessments(prev => prev.filter(a => a.ID !== id));
                if (selectedAssessment?.ID === id) { setSelectedAssessment(null); setSubmissions([]); }
            } else setError('삭제에 실패했습니다.');
        } catch { setError('서버 연결에 실패했습니다.'); }
    };

    const handleCreate = async () => {
        if (!newAssessment.title.trim()) return;
        setIsLoading(true); setError('');
        try {
            const params = new URLSearchParams({
                action: 'createAssessment',
                title: newAssessment.title,
                description: newAssessment.description,
                criteria: newAssessment.criteria,
                deadline: newAssessment.deadline,
                grades: newAssessment.grades.join(','),
                type: newAssessment.type,
                questions: JSON.stringify(newAssessment.questions),
                maxScore: newAssessment.maxScore,
            });
            const res = await fetch(`${GAS_URL}?${params}`);
            const data = await res.json();
            if (data.status === 'success') {
                setNewAssessment({ title: '', description: '', criteria: '', deadline: '', grades: [], type: '서답형', questions: [], maxScore: '' });
                await fetchAssessments();
            } else setError('등록에 실패했습니다.');
        } catch { setError('서버 연결에 실패했습니다.'); }
        finally { setIsLoading(false); }
    };

    return (
        <div className="teacher-dashboard fade-in">
            <section className="admin-header">
                <h2>교사 관리 센터</h2>
                <p>수행평가 항목을 관리하고 학생들의 결과물을 채점하세요.</p>
            </section>

            <div className="dashboard-grid">
                {/* 등록 폼 */}
                <div className="glass-card p-6">
                    <h3>새 수행평가 등록</h3>
                    <div className="input-group">
                        <input type="text" placeholder="평가 제목" value={newAssessment.title}
                            onChange={e => setNewAssessment({ ...newAssessment, title: e.target.value })} />
                        <textarea placeholder="상세 설명 (평가 안내)" value={newAssessment.description}
                            onChange={e => setNewAssessment({ ...newAssessment, description: e.target.value })} />
                        <textarea placeholder="평가 기준 (학생 공개용)" value={newAssessment.criteria}
                            onChange={e => setNewAssessment({ ...newAssessment, criteria: e.target.value })} />

                        <label style={{ fontSize: '0.85rem', color: '#666' }}>공개 학년 (복수 선택 가능)</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {GRADES.map(g => (
                                <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={newAssessment.grades.includes(String(g))}
                                        onChange={e => {
                                            const gs = e.target.checked
                                                ? [...newAssessment.grades, String(g)]
                                                : newAssessment.grades.filter(x => x !== String(g));
                                            setNewAssessment({ ...newAssessment, grades: gs });
                                        }} />
                                    {g}학년
                                </label>
                            ))}
                        </div>

                        <label style={{ fontSize: '0.85rem', color: '#666' }}>평가 유형</label>
                        <select value={newAssessment.type}
                            onChange={e => setNewAssessment({ ...newAssessment, type: e.target.value, questions: [] })}>
                            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>

                        {newAssessment.type === '객관식' && (
                            <>
                                <label style={{ fontSize: '0.85rem', color: '#666' }}>객관식 문제 출제</label>
                                <MultipleChoiceEditor
                                    questions={newAssessment.questions}
                                    onChange={qs => setNewAssessment({ ...newAssessment, questions: qs })} />
                            </>
                        )}
                        {(newAssessment.type === '주관식 퀴즈' || newAssessment.type === '서답형') && (
                            <>
                                <label style={{ fontSize: '0.85rem', color: '#666' }}>
                                    {newAssessment.type === '서답형' ? '서답형 안내 문구' : '주관식 문제 출제'}
                                </label>
                                <ShortAnswerEditor
                                    questions={newAssessment.questions}
                                    onChange={qs => setNewAssessment({ ...newAssessment, questions: qs })}
                                    type={newAssessment.type} />
                            </>
                        )}
                        {newAssessment.type === '파일 업로드' && (
                            <p style={{ fontSize: '0.85rem', color: '#888' }}>학생이 파일을 업로드합니다. 파일명은 학년-반-번호-이름으로 자동 저장됩니다.</p>
                        )}

                        <label style={{ fontSize: '0.85rem', color: '#666' }}>만점 (선택)</label>
                        <input type="number" placeholder="예: 100" min="1" value={newAssessment.maxScore}
                            onChange={e => setNewAssessment({ ...newAssessment, maxScore: e.target.value })} />
                        <label style={{ fontSize: '0.85rem', color: '#666' }}>제출 기한</label>
                        <input type="datetime-local" value={newAssessment.deadline}
                            onChange={e => setNewAssessment({ ...newAssessment, deadline: e.target.value })} />
                        <button className="btn-primary w-full" onClick={handleCreate}>저장 및 등록</button>
                    </div>
                </div>

                {/* 평가 목록 */}
                <div className="glass-card p-6">
                    <h3>진행 중인 평가 목록</h3>
                    {error && <p className="error-msg">{error}</p>}
                    <div className="assessment-list">
                        {isLoading ? <p className="empty-msg">불러오는 중...</p>
                            : assessments.length === 0 ? <p className="empty-msg">등록된 평가가 없습니다.</p>
                                : (() => {
                                    // 학년별 그룹핑: 학년 미지정은 '전체' 그룹
                                    const groups = {};
                                    assessments.forEach(item => {
                                        const gs = item.Grades ? String(item.Grades).split(',').filter(Boolean) : [];
                                        const keys = gs.length > 0 ? gs.map(g => `${g}학년`) : ['전체'];
                                        keys.forEach(k => {
                                            if (!groups[k]) groups[k] = [];
                                            groups[k].push(item);
                                        });
                                    });
                                    const sortedKeys = Object.keys(groups).sort((a, b) => {
                                        if (a === '전체') return 1;
                                        if (b === '전체') return -1;
                                        return parseInt(a) - parseInt(b);
                                    });
                                    return sortedKeys.map(grade => (
                                        <div key={grade}>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1a73e8', borderBottom: '2px solid #1a73e8', padding: '0.25rem 0', marginBottom: '0.5rem', marginTop: '0.75rem' }}>
                                                {grade}
                                            </div>
                                            {groups[grade].map(item => (
                                                <AssessmentItem key={item.ID} item={item}
                                                    onGrade={() => fetchSubmissions(item)}
                                                    onUpdateDeadline={handleUpdateDeadline}
                                                    onUpdate={handleUpdate}
                                                    onDelete={handleDelete}
                                                    onToggleVisibility={handleToggleVisibility} />
                                            ))}
                                        </div>
                                    ));
                                })()
                        }
                    </div>
                </div>
            </div>

            {/* 채점 패널 */}
            {selectedAssessment && (
                <div className="glass-card p-6" style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                            <h3 style={{ margin: '0 0 0.25rem' }}>채점: {selectedAssessment.Title}
                                <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: '0.5rem' }}>({selectedAssessment.Type})</span>
                            </h3>
                            {(selectedAssessment.Type === '주관식 퀴즈' || selectedAssessment.Type === '서답형') && (() => {
                                let qs = [];
                                try { qs = JSON.parse(selectedAssessment.Questions || '[]'); } catch {}
                                return qs.length > 0 ? (
                                    <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '0.25rem' }}>
                                        {qs.map((q, i) => <span key={i} style={{ marginRight: '1rem' }}>{i + 1}. {q.question}</span>)}
                                    </div>
                                ) : null;
                            })()}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-outline" onClick={handleDownloadCSV}>학년별 CSV 다운로드</button>
                            <button className="btn-text" onClick={() => { setSelectedAssessment(null); setSubmissions([]); }}>닫기</button>
                        </div>
                    </div>
                    {isLoading ? <p className="empty-msg">불러오는 중...</p>
                        : submissions.length === 0 ? <p className="empty-msg">제출된 내용이 없습니다.</p>
                            : (
                                <>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                        <input type="checkbox"
                                            checked={submissions.length > 0 && submissions.every((_, i) => checkedRows[i])}
                                            onChange={e => {
                                                const next = {};
                                                if (e.target.checked) submissions.forEach((_, i) => { next[i] = true; });
                                                setCheckedRows(next);
                                            }} />
                                        전체선택
                                    </label>
                                    {selectedAssessment.MaxScore && (
                                        <button onClick={() => handleBulkSetScore(selectedAssessment.MaxScore)}
                                            style={{ background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.25rem 0.7rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                            선택 만점({selectedAssessment.MaxScore}점) 부여
                                        </button>
                                    )}
                                    <button onClick={() => handleBulkScorePublic(true)}
                                        style={{ background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.25rem 0.7rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                        선택 공개
                                    </button>
                                    <button onClick={() => handleBulkScorePublic(false)}
                                        style={{ background: '#e57373', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.25rem 0.7rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                        선택 비공개
                                    </button>
                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>{Object.values(checkedRows).filter(Boolean).length}명 선택됨</span>
                                </div>
                                <div className="table-container">
                                    <table className="grading-table">
                                        <thead>
                                            <tr>
                                                <th></th>
                                                <th>학년</th>
                                                <th>반</th>
                                                <th>번호</th>
                                                <th>이름</th>
                                                <th className="content-col">내용/파일</th>
                                                <th>점수</th>
                                                <th>저장</th>
                                                <th>공개여부</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {submissions.map((s, i) => (
                                                <ScoreRow key={i} submission={s} onSave={handleUpdateScore} assessmentType={selectedAssessment.Type}
                                                    checked={!!checkedRows[i]} onCheck={v => setCheckedRows(prev => ({ ...prev, [i]: v }))} />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                </>
                            )}
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
