import { useState, useEffect } from 'react';
import './TeacherDashboard.css';

const GAS_URL = '/api/gas';

// 참고 이미지 표시 컴포넌트 (refimg:// → GAS에서 data URL 조회)
const RefImage = ({ url, style }) => {
    const [src, setSrc] = useState('');
    useEffect(() => {
        if (!url) return;
        if (url.startsWith('refimg://')) {
            const imgId = url.replace('refimg://', '');
            fetch(`${GAS_URL}?action=getRefImage&imgId=${encodeURIComponent(imgId)}`)
                .then(r => r.json())
                .then(d => { if (d.status === 'success') setSrc(d.dataUrl); })
                .catch(() => {});
        } else if (url.startsWith('data:')) {
            setSrc(url);
        }
    }, [url]);
    if (!src) return null;
    return <img src={src} alt="참고 이미지" style={style} />;
};

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

// ── 마감 D-day 뱃지 ─────────────────────────────────────────────────
const DeadlineBadge = ({ deadline }) => {
    if (!deadline) return null;
    const now = new Date();
    const dl = new Date(deadline);
    const diffMs = dl - now;
    if (diffMs < 0) return <span style={{ fontSize: '0.75rem', color: '#fff', background: '#e53935', borderRadius: '4px', padding: '2px 6px', marginLeft: '0.5rem' }}>마감됨</span>;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) {
        const label = diffDays === 0 ? 'D-day' : `D-${diffDays}`;
        return <span style={{ fontSize: '0.75rem', color: '#fff', background: '#f57c00', borderRadius: '4px', padding: '2px 6px', marginLeft: '0.5rem' }}>{label}</span>;
    }
    return <span style={{ fontSize: '0.8rem', color: '#555', marginLeft: '0.5rem' }}>기한: {dl.toLocaleString('ko-KR')}</span>;
};

// ── 평가 항목 카드 ──────────────────────────────────────────────────
const AssessmentItem = ({ item, onGrade, onUpdateDeadline, onUpdate, onDelete, onToggleVisibility, onCopy }) => {
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
        refText: item.RefText || '',
        refImageUrl: item.RefImageUrl || '',
    });
    const [editRefUploading, setEditRefUploading] = useState(false);
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
                <DeadlineBadge deadline={item.Deadline} />
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
                    <label style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>예시문 (선택)</label>
                    <textarea
                        placeholder="학생에게 보여줄 예시문이나 안내글을 입력하세요"
                        value={editForm.refText}
                        onChange={e => setEditForm({ ...editForm, refText: e.target.value })}
                        style={{ minHeight: '80px' }}
                    />
                    <label style={{ fontSize: '0.85rem', color: '#666' }}>참고 이미지 (선택)</label>
                    {editForm.refImageUrl && (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <RefImage url={editForm.refImageUrl} style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '6px', border: '1px solid #ddd' }} />
                            <button
                                onClick={() => setEditForm({ ...editForm, refImageUrl: '' })}
                                style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#e57373', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', lineHeight: '1' }}
                            >×</button>
                        </div>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        disabled={editRefUploading}
                        onChange={async e => {
                            const f = e.target.files[0];
                            if (!f) return;
                            setEditRefUploading(true);
                            try {
                                const base64 = await new Promise((resolve, reject) => {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                        const img = new Image();
                                        img.onload = () => {
                                            const MAX = 500;
                                            let w = img.width, h = img.height;
                                            if (w > MAX || h > MAX) {
                                                if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                                                else { w = Math.round(w * MAX / h); h = MAX; }
                                            }
                                            const canvas = document.createElement('canvas');
                                            canvas.width = w; canvas.height = h;
                                            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                                            resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
                                        };
                                        img.onerror = reject;
                                        img.src = ev.target.result;
                                    };
                                    reader.onerror = reject;
                                    reader.readAsDataURL(f);
                                });
                                const res = await fetch(GAS_URL, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'uploadRefMaterial', fileData: base64, fileName: f.name, mimeType: 'image/jpeg' }),
                                });
                                const data = await res.json();
                                if (data.status === 'success') setEditForm(prev => ({ ...prev, refImageUrl: data.url }));
                            } catch {}
                            finally { setEditRefUploading(false); }
                        }}
                    />
                    {editRefUploading && <p style={{ fontSize: '0.8rem', color: '#888', margin: 0 }}>이미지 업로드 중...</p>}
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
                <button onClick={() => onCopy(item)} style={{ color: '#1a73e8' }}>복사</button>
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

// ── 채점 행 (미리보기 포함) ──────────────────────────────────────────
const ScoreRow = ({ submission: s, onSave, assessmentType, checked, onCheck }) => {
    const [score, setScore] = useState(s.Score || '');
    const [expanded, setExpanded] = useState(false);
    useEffect(() => { setScore(s.Score || ''); }, [s.Score]);

    const contentPreview = assessmentType === '파일 업로드'
        ? (s.FileURL ? <a href={s.FileURL} target="_blank" rel="noreferrer" className="file-link">파일 보기</a> : '-')
        : assessmentType === '주관식 퀴즈' || assessmentType === '서답형'
            ? extractAnswers(s.Content)
            : s.Content;

    const hasFullContent = s.Content && s.Content.length > 30 && assessmentType !== '파일 업로드';

    return (
        <>
            <tr>
                <td><input type="checkbox" checked={checked} onChange={e => onCheck(e.target.checked)} /></td>
                <td>{s.Grade}</td>
                <td>{s.Class}</td>
                <td>{s.Number}</td>
                <td>{s.Name}</td>
                <td className="content-cell">
                    <span style={{ cursor: hasFullContent ? 'pointer' : 'default' }} onClick={() => hasFullContent && setExpanded(v => !v)}>
                        {contentPreview}
                        {hasFullContent && <span style={{ fontSize: '0.75rem', color: '#1a73e8', marginLeft: '0.25rem' }}>{expanded ? '▲' : '▼'}</span>}
                    </span>
                </td>
                <td>
                    <input type="number" value={score} onChange={e => setScore(e.target.value)} className="score-input" />
                </td>
                <td><button onClick={() => onSave(s, score)} className="save-btn">저장</button></td>
                <td style={{ textAlign: 'center', color: s.IsScorePublic ? '#4caf50' : '#aaa', fontSize: '0.8rem' }}>
                    {s.IsScorePublic ? '공개' : '비공개'}
                </td>
            </tr>
            {expanded && (
                <tr>
                    <td colSpan={9}>
                        <div style={{ background: '#f8f9fa', borderRadius: '6px', padding: '0.75rem 1rem', fontSize: '0.9rem', whiteSpace: 'pre-wrap', color: '#333', margin: '0 0.25rem 0.25rem' }}>
                            {s.Content}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

// ── 메인 대시보드 ────────────────────────────────────────────────────
const TeacherDashboard = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [authError, setAuthError] = useState('');
    const [assessments, setAssessments] = useState([]);
    const [newAssessment, setNewAssessment] = useState({
        title: '', description: '', criteria: '', deadline: '', grades: [], type: '서답형', questions: [], maxScore: '', refText: '', refImageUrl: ''
    });
    const [refImageFile, setRefImageFile] = useState(null);
    const [refImageUploading, setRefImageUploading] = useState(false);
    const [submissions, setSubmissions] = useState([]);
    const [allSubmissions, setAllSubmissions] = useState([]); // 전체 제출 (학생 이력용)
    const [selectedAssessment, setSelectedAssessment] = useState(null);
    const [checkedRows, setCheckedRows] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // 채점 패널 탭: 'grading' | 'unsubmitted' | 'stats' | 'history'
    const [gradingTab, setGradingTab] = useState('grading');
    // 학생 이력 선택
    const [historyStudent, setHistoryStudent] = useState(null);
    // 평가 정렬 순서
    const [sortOrder, setSortOrder] = useState('default'); // 'default' | 'deadline' | 'title'

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
        setSelectedAssessment(assessment); setSubmissions([]); setAllSubmissions([]); setCheckedRows({});
        setGradingTab('grading'); setHistoryStudent(null);
        setIsLoading(true); setError('');
        try {
            const res = await fetch(`${GAS_URL}?action=getSubmissions`);
            const data = await res.json();
            const all = Array.isArray(data) ? data : [];
            setAllSubmissions(all);
            setSubmissions(all.filter(s => s.AssessmentID === assessment.ID));
        } catch { setError('제출 목록을 불러오지 못했습니다.'); }
        finally { setIsLoading(false); }
    };

    const handleUpdateScore = async (submission, score) => {
        try {
            const params = new URLSearchParams({ action: 'updateScore', grade: submission.Grade, class: submission.Class, number: submission.Number, assessmentID: submission.AssessmentID, score });
            const res = await fetch(`${GAS_URL}?${params}`);
            const data = await res.json();
            if (data.status === 'success')
                setSubmissions(prev => prev.map(s =>
                    s.Grade === submission.Grade && s.Class === submission.Class && s.Number === submission.Number && s.AssessmentID === submission.AssessmentID
                        ? { ...s, Score: score } : s
                ));
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

    // ── 평가 복사 ────────────────────────────────────────────────────
    const handleCopy = async (item) => {
        if (!window.confirm(`"${item.Title}" 평가를 복사할까요?`)) return;
        setIsLoading(true); setError('');
        try {
            const params = new URLSearchParams({
                action: 'createAssessment',
                title: `${item.Title} (복사본)`,
                description: item.Description || '',
                criteria: item.Criteria || '',
                deadline: item.Deadline ? new Date(item.Deadline).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                grades: item.Grades || '',
                type: item.Type || '서답형',
                questions: item.Questions || '[]',
                maxScore: item.MaxScore || '',
                refText: item.RefText || '',
                refImageUrl: item.RefImageUrl || '',
            });
            const res = await fetch(`${GAS_URL}?${params}`);
            const data = await res.json();
            if (data.status === 'success') await fetchAssessments();
            else setError('복사에 실패했습니다.');
        } catch { setError('서버 연결에 실패했습니다.'); }
        finally { setIsLoading(false); }
    };

    const handleBulkSetScore = async (score) => {
        const targets = submissions.filter((_, i) => checkedRows[i]);
        if (targets.length === 0) { setError('학생을 선택해주세요.'); return; }
        setError('');
        setCheckedRows({});
        try {
            await Promise.all(targets.map(s => {
                const params = new URLSearchParams({
                    action: 'updateScore',
                    grade: String(Math.round(Number(s.Grade))),
                    class: String(Math.round(Number(s.Class))),
                    number: String(Math.round(Number(s.Number))),
                    name: String(s.Name),
                    assessmentID: String(s.AssessmentID),
                    score: String(Number(score)),
                });
                return fetch(`${GAS_URL}?${params}`);
            }));
        } catch {}
        await fetchSubmissions(selectedAssessment);
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

            const gradeGroups = {};
            allSubs.forEach(s => {
                const g = s.Grade;
                if (!gradeGroups[g]) gradeGroups[g] = {};
                const key = `${s.Class}-${s.Number}`;
                if (!gradeGroups[g][key]) gradeGroups[g][key] = { Class: s.Class, Number: s.Number, Name: s.Name, scores: {} };
                gradeGroups[g][key].scores[s.AssessmentID] = s.Score;
            });

            const assessmentMap = {};
            assessments.forEach(a => { assessmentMap[a.ID] = a.Title; });

            Object.keys(gradeGroups).sort().forEach(grade => {
                const students = Object.values(gradeGroups[grade]).sort((a, b) => a.Class - b.Class || a.Number - b.Number);
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

    const handleUploadRefImage = async (file, onSuccess) => {
        if (!file) return;
        setRefImageUploading(true);
        try {
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = new Image();
                    img.onload = () => {
                        const MAX = 500;
                        let w = img.width, h = img.height;
                        if (w > MAX || h > MAX) {
                            if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                            else { w = Math.round(w * MAX / h); h = MAX; }
                        }
                        const canvas = document.createElement('canvas');
                        canvas.width = w; canvas.height = h;
                        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                        resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
                    };
                    img.onerror = reject;
                    img.src = ev.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const res = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'uploadRefMaterial', fileData: base64, fileName: file.name, mimeType: 'image/jpeg' }),
            });
            const data = await res.json();
            if (data.status === 'success') onSuccess(data.url);
            else setError('이미지 업로드 실패: ' + (data.message || ''));
        } catch { setError('이미지 처리 중 오류가 발생했습니다.'); }
        finally { setRefImageUploading(false); }
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
                refText: newAssessment.refText,
                refImageUrl: newAssessment.refImageUrl,
            });
            const res = await fetch(`${GAS_URL}?${params}`);
            const data = await res.json();
            if (data.status === 'success') {
                setNewAssessment({ title: '', description: '', criteria: '', deadline: '', grades: [], type: '서답형', questions: [], maxScore: '', refText: '', refImageUrl: '' });
                setRefImageFile(null);
                await fetchAssessments();
            } else setError('등록에 실패했습니다.');
        } catch { setError('서버 연결에 실패했습니다.'); }
        finally { setIsLoading(false); }
    };

    // ── 점수 통계 계산 ───────────────────────────────────────────────
    const calcStats = (subs) => {
        const scored = subs.filter(s => s.Score !== '' && s.Score !== null && s.Score !== undefined && !isNaN(Number(s.Score)));
        if (scored.length === 0) return null;
        const nums = scored.map(s => Number(s.Score));
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
        return {
            count: scored.length,
            avg: avg.toFixed(1),
            max: Math.max(...nums),
            min: Math.min(...nums),
        };
    };

    // ── 미제출 학생 계산 (제출자 목록 - 전체 학생 개념은 없으므로 학년별 기제출자 외 표시) ──
    const getUnsubmitted = () => {
        // 현재 평가 기제출자 key
        const submittedKeys = new Set(submissions.map(s => `${s.Grade}-${s.Class}-${s.Number}-${s.Name}`));
        // 다른 평가에서 확인된 전체 학생 (allSubmissions 기준)
        const allStudentKeys = new Set();
        const allStudents = {};
        allSubmissions.forEach(s => {
            const key = `${s.Grade}-${s.Class}-${s.Number}-${s.Name}`;
            if (!allStudentKeys.has(key)) {
                allStudentKeys.add(key);
                allStudents[key] = { Grade: s.Grade, Class: s.Class, Number: s.Number, Name: s.Name };
            }
        });
        // 해당 평가 학년 필터
        const aGrades = selectedAssessment?.Grades ? String(selectedAssessment.Grades).split(',').filter(Boolean) : [];
        return Object.values(allStudents)
            .filter(st => {
                if (aGrades.length > 0 && !aGrades.includes(String(st.Grade))) return false;
                return !submittedKeys.has(`${st.Grade}-${st.Class}-${st.Number}-${st.Name}`);
            })
            .sort((a, b) => a.Grade - b.Grade || a.Class - b.Class || a.Number - b.Number);
    };

    // ── 학생별 제출 이력 ─────────────────────────────────────────────
    const getStudentHistory = (student) => {
        if (!student) return [];
        return allSubmissions
            .filter(s => s.Grade == student.Grade && s.Class == student.Class && s.Number == student.Number && s.Name === student.Name)
            .map(s => {
                const assessment = assessments.find(a => a.ID === s.AssessmentID);
                return { ...s, AssessmentTitle: assessment?.Title || s.AssessmentID };
            });
    };

    // ── 평가 목록 정렬 ───────────────────────────────────────────────
    const getSortedAssessments = (list) => {
        if (sortOrder === 'deadline') {
            return [...list].sort((a, b) => {
                if (!a.Deadline) return 1;
                if (!b.Deadline) return -1;
                return new Date(a.Deadline) - new Date(b.Deadline);
            });
        }
        if (sortOrder === 'title') {
            return [...list].sort((a, b) => String(a.Title).localeCompare(String(b.Title), 'ko'));
        }
        return list;
    };

    const stats = calcStats(submissions);
    const unsubmitted = selectedAssessment ? getUnsubmitted() : [];
    const studentHistory = getStudentHistory(historyStudent);

    // 고유 학생 목록 (이력 조회용)
    const uniqueStudents = (() => {
        const seen = new Set();
        return allSubmissions.filter(s => {
            const key = `${s.Grade}-${s.Class}-${s.Number}-${s.Name}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).sort((a, b) => a.Grade - b.Grade || a.Class - b.Class || a.Number - b.Number);
    })();

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

                        <label style={{ fontSize: '0.85rem', color: '#666' }}>예시문 (선택)</label>
                        <textarea placeholder="학생에게 보여줄 예시문이나 안내글을 입력하세요" value={newAssessment.refText}
                            onChange={e => setNewAssessment({ ...newAssessment, refText: e.target.value })}
                            style={{ minHeight: '80px' }} />
                        <label style={{ fontSize: '0.85rem', color: '#666' }}>참고 이미지 (선택)</label>
                        {newAssessment.refImageUrl && (
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <RefImage url={newAssessment.refImageUrl} style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '6px', border: '1px solid #ddd' }} />
                                <button
                                    onClick={() => setNewAssessment({ ...newAssessment, refImageUrl: '' })}
                                    style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#e57373', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', lineHeight: '1' }}
                                >×</button>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            disabled={refImageUploading}
                            onChange={e => {
                                const f = e.target.files[0];
                                if (f) handleUploadRefImage(f, url => setNewAssessment(prev => ({ ...prev, refImageUrl: url })));
                            }}
                        />
                        {refImageUploading && <p style={{ fontSize: '0.8rem', color: '#888', margin: 0 }}>이미지 업로드 중...</p>}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h3 style={{ margin: 0 }}>진행 중인 평가 목록</h3>
                        <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}
                            style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}>
                            <option value="default">등록 순</option>
                            <option value="deadline">마감일 순</option>
                            <option value="title">제목 순</option>
                        </select>
                    </div>
                    {error && <p className="error-msg">{error}</p>}
                    <div className="assessment-list">
                        {isLoading ? <p className="empty-msg">불러오는 중...</p>
                            : assessments.length === 0 ? <p className="empty-msg">등록된 평가가 없습니다.</p>
                                : (() => {
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
                                            {getSortedAssessments(groups[grade]).map(item => (
                                                <AssessmentItem key={item.ID} item={item}
                                                    onGrade={() => fetchSubmissions(item)}
                                                    onUpdateDeadline={handleUpdateDeadline}
                                                    onUpdate={handleUpdate}
                                                    onDelete={handleDelete}
                                                    onToggleVisibility={handleToggleVisibility}
                                                    onCopy={handleCopy} />
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
                            {/* 점수 통계 */}
                            {stats && (
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                    {[
                                        { label: '제출', value: `${stats.count}명` },
                                        { label: '평균', value: `${stats.avg}점` },
                                        { label: '최고', value: `${stats.max}점` },
                                        { label: '최저', value: `${stats.min}점` },
                                    ].map(({ label, value }) => (
                                        <span key={label} style={{ fontSize: '0.8rem', background: '#e8f4fd', color: '#1a73e8', borderRadius: '4px', padding: '2px 8px' }}>
                                            {label}: <strong>{value}</strong>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-outline" onClick={handleDownloadCSV}>학년별 CSV 다운로드</button>
                            <button className="btn-text" onClick={() => { setSelectedAssessment(null); setSubmissions([]); setAllSubmissions([]); }}>닫기</button>
                        </div>
                    </div>

                    {/* 탭 */}
                    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                        {[
                            { id: 'grading', label: `채점 (${submissions.length}명)` },
                            { id: 'unsubmitted', label: `미제출 (${unsubmitted.length}명)` },
                            { id: 'stats', label: '점수 통계' },
                            { id: 'history', label: '학생별 이력' },
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setGradingTab(tab.id)}
                                style={{
                                    padding: '0.3rem 0.75rem', fontSize: '0.85rem', cursor: 'pointer', border: 'none',
                                    borderRadius: '4px 4px 0 0',
                                    background: gradingTab === tab.id ? '#1a73e8' : '#f5f5f5',
                                    color: gradingTab === tab.id ? '#fff' : '#555',
                                }}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {isLoading ? <p className="empty-msg">불러오는 중...</p> : (
                        <>
                            {/* 채점 탭 */}
                            {gradingTab === 'grading' && (
                                submissions.length === 0 ? <p className="empty-msg">제출된 내용이 없습니다.</p> : (
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
                                )
                            )}

                            {/* 미제출 탭 */}
                            {gradingTab === 'unsubmitted' && (
                                unsubmitted.length === 0
                                    ? <p className="empty-msg">미제출 학생이 없거나 확인할 수 없습니다. (다른 평가 제출 이력 기준)</p>
                                    : (
                                        <div className="table-container">
                                            <table className="grading-table">
                                                <thead>
                                                    <tr><th>학년</th><th>반</th><th>번호</th><th>이름</th></tr>
                                                </thead>
                                                <tbody>
                                                    {unsubmitted.map((s, i) => (
                                                        <tr key={i}>
                                                            <td>{s.Grade}</td>
                                                            <td>{s.Class}</td>
                                                            <td>{s.Number}</td>
                                                            <td>{s.Name}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )
                            )}

                            {/* 점수 통계 탭 */}
                            {gradingTab === 'stats' && (
                                <div>
                                    {!stats ? <p className="empty-msg">채점된 점수가 없습니다.</p> : (
                                        <>
                                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                                                {[
                                                    { label: '채점 완료', value: `${stats.count}명`, color: '#1a73e8' },
                                                    { label: '평균 점수', value: `${stats.avg}점`, color: '#4caf50' },
                                                    { label: '최고 점수', value: `${stats.max}점`, color: '#f57c00' },
                                                    { label: '최저 점수', value: `${stats.min}점`, color: '#e53935' },
                                                ].map(({ label, value, color }) => (
                                                    <div key={label} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '1rem 1.5rem', textAlign: 'center', minWidth: '100px' }}>
                                                        <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', color: '#888' }}>{label}</p>
                                                        <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color }}>{value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="table-container">
                                                <table className="grading-table">
                                                    <thead>
                                                        <tr><th>학년</th><th>반</th><th>번호</th><th>이름</th><th>점수</th></tr>
                                                    </thead>
                                                    <tbody>
                                                        {[...submissions]
                                                            .filter(s => s.Score !== '' && s.Score !== null && s.Score !== undefined)
                                                            .sort((a, b) => Number(b.Score) - Number(a.Score))
                                                            .map((s, i) => (
                                                                <tr key={i}>
                                                                    <td>{s.Grade}</td>
                                                                    <td>{s.Class}</td>
                                                                    <td>{s.Number}</td>
                                                                    <td>{s.Name}</td>
                                                                    <td style={{ fontWeight: 'bold', color: '#1a73e8' }}>{s.Score}점</td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* 학생별 이력 탭 */}
                            {gradingTab === 'history' && (
                                <div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ fontSize: '0.85rem', color: '#666', marginRight: '0.5rem' }}>학생 선택:</label>
                                        <select
                                            value={historyStudent ? `${historyStudent.Grade}-${historyStudent.Class}-${historyStudent.Number}-${historyStudent.Name}` : ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (!val) { setHistoryStudent(null); return; }
                                                const [grade, cls, number, ...nameParts] = val.split('-');
                                                setHistoryStudent({ Grade: grade, Class: cls, Number: number, Name: nameParts.join('-') });
                                            }}
                                            style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.85rem' }}
                                        >
                                            <option value="">-- 학생을 선택하세요 --</option>
                                            {uniqueStudents.map(s => (
                                                <option key={`${s.Grade}-${s.Class}-${s.Number}-${s.Name}`} value={`${s.Grade}-${s.Class}-${s.Number}-${s.Name}`}>
                                                    {s.Grade}학년 {s.Class}반 {s.Number}번 {s.Name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {historyStudent && (
                                        studentHistory.length === 0
                                            ? <p className="empty-msg">제출 이력이 없습니다.</p>
                                            : (
                                                <div className="table-container">
                                                    <table className="grading-table">
                                                        <thead>
                                                            <tr><th>평가명</th><th>제출 시각</th><th>점수</th><th>공개</th></tr>
                                                        </thead>
                                                        <tbody>
                                                            {studentHistory.map((s, i) => (
                                                                <tr key={i}>
                                                                    <td>{s.AssessmentTitle}</td>
                                                                    <td style={{ fontSize: '0.8rem', color: '#666' }}>{s.Timestamp ? new Date(s.Timestamp).toLocaleString('ko-KR') : '-'}</td>
                                                                    <td style={{ fontWeight: 'bold', color: '#1a73e8' }}>{s.Score !== '' && s.Score !== null ? `${s.Score}점` : '미채점'}</td>
                                                                    <td style={{ color: s.IsScorePublic ? '#4caf50' : '#aaa', fontSize: '0.8rem' }}>{s.IsScorePublic ? '공개' : '비공개'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
