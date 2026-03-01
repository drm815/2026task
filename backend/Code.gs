const CONFIG = {
  SHEET_NAME: 'Data',
  ASSESSMENT_SHEET: 'Assessments',
  STUDENT_CODE_SHEET: 'StudentCodes',
  SPREADSHEET_ID: '17Sh0JAetBrjMV0-QAzhv0X31HYYgYzDFRTXMzb2fJVg'
};

function doGet(e) {
  try {
    var p = e.parameter;
    var action = p.action;
    if (action === 'getAssessments')    return handleGetAssessments();
    if (action === 'getSubmissions')    return handleGetSubmissions();
    if (action === 'verifyTeacher')     return handleVerifyTeacher(p);
    if (action === 'submitAssignment')  return handleSubmit(p);
    if (action === 'updateScore')       return handleUpdateScore(p);
    if (action === 'createAssessment')  return handleCreateAssessment(p);
    if (action === 'toggleVisibility')  return handleToggleVisibility(p);
    if (action === 'updateDeadline')    return handleUpdateDeadline(p);
    if (action === 'updateAssessment')  return handleUpdateAssessment(p);
    if (action === 'deleteAssessment')  return handleDeleteAssessment(p);
    if (action === 'toggleScorePublic') return handleToggleScorePublic(p);
    if (action === 'getMyScores')       return handleGetMyScores(p);
    if (action === 'getMySubmissions')  return handleGetMySubmissions(p);
    if (action === 'verifyStudentCode') return handleVerifyStudentCode(p);
    if (action === 'issueStudentCode')  return handleIssueStudentCode(p);
    if (action === 'uploadRefMaterial') return handleUploadRefMaterial(p);
    return createResponse({ status: 'error', message: 'Unknown action' });
  } catch (err) {
    return createResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    var p = e.parameter;
    var body = {};
    if (e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); } catch {}
    }
    var action = body.action || p.action;
    if (action === 'submitAssignment')  return handleSubmit(body);
    if (action === 'uploadRefMaterial') return handleUploadRefMaterial(body);
    return createResponse({ status: 'error', message: 'Unknown action' });
  } catch (err) {
    return createResponse({ status: 'error', message: err.toString() });
  }
}

function setPassword() {
  PropertiesService.getScriptProperties().setProperty('TEACHER_PASSWORD', 'love0310##');
}

function isValidGrade(v)    { return Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 6; }
function isValidClass(v)    { return Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 20; }
function isValidNumber(v)   { return Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 60; }
function isValidName(v)     { return typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= 10; }
function isValidText(v, max){ return typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= max; }
function isValidUuid(v)     { return typeof v === 'string' && /^[0-9a-f-]{36}$/.test(v); }
function isValidScore(v)    { return v !== '' && v !== null && v !== undefined && Number(v) >= 0 && Number(v) <= 10000; }
function isValidMaxScore(v) { return v === '' || v === undefined || v === null || (Number(v) >= 1 && Number(v) <= 10000); }
function isValidDeadline(v) { return typeof v === 'string' && !isNaN(Date.parse(v)); }
function isValidCode(v)     { return typeof v === 'string' && /^\d{4}$/.test(v); }

// ── 학생 코드 관련 ──────────────────────────────────────────────────

function getOrCreateStudentCode(grade, cls, number, name) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.STUDENT_CODE_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.STUDENT_CODE_SHEET);
    sheet.appendRow(['Grade', 'Class', 'Number', 'Name', 'Code']);
  }
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == grade && rows[i][1] == cls && rows[i][2] == number && rows[i][3] == name) {
      return String(rows[i][4]);
    }
  }
  // 신규 코드 생성 (4자리 랜덤)
  var code = String(Math.floor(1000 + Math.random() * 9000));
  sheet.appendRow([grade, cls, number, name, code]);
  return code;
}

function handleIssueStudentCode(p) {
  if (!isValidGrade(p.grade))   return createResponse({ status: 'error', message: 'Invalid grade' });
  if (!isValidClass(p.class))   return createResponse({ status: 'error', message: 'Invalid class' });
  if (!isValidNumber(p.number)) return createResponse({ status: 'error', message: 'Invalid number' });
  if (!isValidName(p.name))     return createResponse({ status: 'error', message: 'Invalid name' });
  var code = getOrCreateStudentCode(p.grade, p.class, p.number, p.name);
  return createResponse({ status: 'success', code: code });
}

function handleVerifyStudentCode(p) {
  if (!isValidGrade(p.grade))   return createResponse({ status: 'error', message: 'Invalid grade' });
  if (!isValidClass(p.class))   return createResponse({ status: 'error', message: 'Invalid class' });
  if (!isValidNumber(p.number)) return createResponse({ status: 'error', message: 'Invalid number' });
  if (!isValidName(p.name))     return createResponse({ status: 'error', message: 'Invalid name' });
  if (!isValidCode(p.code))     return createResponse({ status: 'error', message: 'Invalid code' });
  var realCode = getOrCreateStudentCode(p.grade, p.class, p.number, p.name);
  if (p.code === realCode) return createResponse({ status: 'success' });
  return createResponse({ status: 'error', message: '코드가 올바르지 않습니다.' });
}

// ── 제출 여부 조회 ──────────────────────────────────────────────────

function handleGetMySubmissions(p) {
  if (!isValidGrade(p.grade))   return createResponse({ status: 'error', message: 'Invalid grade' });
  if (!isValidClass(p.class))   return createResponse({ status: 'error', message: 'Invalid class' });
  if (!isValidNumber(p.number)) return createResponse({ status: 'error', message: 'Invalid number' });
  if (!isValidName(p.name))     return createResponse({ status: 'error', message: 'Invalid name' });
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) return createResponse([]);
  var rows = sheet.getDataRange().getValues();
  var submitted = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1] == p.grade && rows[i][2] == p.class && rows[i][3] == p.number && rows[i][4] == p.name) {
      submitted.push(String(rows[i][5])); // AssessmentID
    }
  }
  return createResponse(submitted);
}

// ── 평가 목록 ───────────────────────────────────────────────────────

function handleGetAssessments() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.ASSESSMENT_SHEET);
  if (!sheet) return createResponse([]);
  var data = sheet.getDataRange().getValues();
  var headers = data.shift();
  return createResponse(data.map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  }));
}

function handleGetSubmissions() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) return createResponse([]);
  var data = sheet.getDataRange().getValues();
  var headers = data.shift();
  return createResponse(data.map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  }));
}

function handleVerifyTeacher(p) {
  if (!p.password || p.password.length === 0)
    return createResponse({ status: 'error', message: '비밀번호를 입력해주세요.' });
  var pw = PropertiesService.getScriptProperties().getProperty('TEACHER_PASSWORD');
  if (p.password === pw) return createResponse({ status: 'success' });
  return createResponse({ status: 'error', message: '비밀번호가 틀렸습니다.' });
}

function handleSubmit(p) {
  if (!isValidGrade(p.grade))       return createResponse({ status: 'error', message: 'Invalid grade' });
  if (!isValidClass(p.class))       return createResponse({ status: 'error', message: 'Invalid class' });
  if (!isValidNumber(p.number))     return createResponse({ status: 'error', message: 'Invalid number' });
  if (!isValidName(p.name))         return createResponse({ status: 'error', message: 'Invalid name' });
  if (!isValidUuid(p.assessmentID)) return createResponse({ status: 'error', message: 'Invalid assessmentID' });

  // 학생 코드 검증 (코드가 있는 경우만 - 기존 학생은 코드 없이도 첫 제출 가능)
  if (p.code) {
    if (!isValidCode(p.code)) return createResponse({ status: 'error', message: 'Invalid code' });
    var realCode = getOrCreateStudentCode(p.grade, p.class, p.number, p.name);
    if (p.code !== realCode) return createResponse({ status: 'error', message: '본인 확인 코드가 올바르지 않습니다.' });
  }

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(['Timestamp','Grade','Class','Number','Name','AssessmentID','Content','FileURL','Score','IsScorePublic']);
  }

  // 마감 여부 + 평가 유형 확인
  var assessmentType = '서답형';
  var assessmentQuestions = '[]';
  var assessmentTitle = '';
  var assessmentGrade = '';
  var assessmentSheet = ss.getSheetByName(CONFIG.ASSESSMENT_SHEET);
  if (assessmentSheet) {
    var aRows = assessmentSheet.getDataRange().getValues();
    var aHeaders = aRows[0];
    var deadlineCol = aHeaders.indexOf('Deadline');
    var idCol = aHeaders.indexOf('ID');
    var typeCol = aHeaders.indexOf('Type');
    var questionsCol = aHeaders.indexOf('Questions');
    var titleCol = aHeaders.indexOf('Title');
    var gradesCol = aHeaders.indexOf('Grades');
    for (var i = 1; i < aRows.length; i++) {
      if (aRows[i][idCol] == p.assessmentID) {
        if (deadlineCol >= 0) {
          var deadline = new Date(aRows[i][deadlineCol]);
          if (!isNaN(deadline) && new Date() > deadline)
            return createResponse({ status: 'error', message: '제출 기한이 마감되었습니다.' });
        }
        if (typeCol >= 0)      assessmentType = aRows[i][typeCol] || '서답형';
        if (questionsCol >= 0) assessmentQuestions = aRows[i][questionsCol] || '[]';
        if (titleCol >= 0)     assessmentTitle = aRows[i][titleCol] || '';
        if (gradesCol >= 0)    assessmentGrade = aRows[i][gradesCol] || '';
        break;
      }
    }
  }

  // 파일 업로드 처리
  var fileURL = '';
  if (assessmentType === '파일 업로드' && p.fileData && p.fileName && p.mimeType) {
    try {
      var folder = getOrCreateFolder('Performance_Assessments');
      var subFolderName = assessmentGrade + '학년_' + (assessmentTitle || p.assessmentID);
      var subFolder = getOrCreateFolder(subFolderName, folder);
      var blob = Utilities.newBlob(Utilities.base64Decode(p.fileData), p.mimeType, p.fileName);
      var file = subFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileURL = file.getUrl();
    } catch(err) {
      return createResponse({ status: 'error', message: '파일 업로드 실패: ' + err.toString() });
    }
  }

  // 객관식 자동 채점 (문항별 배점 적용)
  var autoScore = undefined;
  if (assessmentType === '객관식' && p.content) {
    try {
      var questions = JSON.parse(assessmentQuestions);
      var studentAnswers = JSON.parse(p.content);
      var totalScore = 0;
      questions.forEach(function(q, qi) {
        if (studentAnswers[qi] !== undefined && Number(studentAnswers[qi]) === Number(q.answer)) {
          totalScore += Number(q.score) || 0;
        }
      });
      autoScore = totalScore;
    } catch(e) { autoScore = undefined; }
  }

  var content = p.content || '';
  var rows = sheet.getDataRange().getValues();

  // 재제출 처리
  for (var j = 1; j < rows.length; j++) {
    if (rows[j][1] == p.grade && rows[j][2] == p.class &&
        rows[j][3] == p.number && rows[j][5] == p.assessmentID) {
      var newScore = autoScore !== undefined ? autoScore : rows[j][8];
      var newFileURL = fileURL || rows[j][7];
      sheet.getRange(j + 1, 1, 1, 10).setValues([[
        new Date(), p.grade, p.class, p.number, p.name,
        p.assessmentID, content, newFileURL, newScore, rows[j][9]
      ]]);
      var result = { status: 'success', resubmitted: true };
      if (autoScore !== undefined) result.autoScore = autoScore;
      return createResponse(result);
    }
  }

  // 최초 제출 - 학생 코드 자동 생성
  getOrCreateStudentCode(p.grade, p.class, p.number, p.name);
  var scoreVal = autoScore !== undefined ? autoScore : '';
  sheet.appendRow([new Date(), p.grade, p.class, p.number, p.name, p.assessmentID, content, fileURL, scoreVal, false]);
  var res = { status: 'success' };
  if (autoScore !== undefined) res.autoScore = autoScore;
  return createResponse(res);
}

function handleUpdateScore(p) {
  if (!isValidGrade(p.grade))       return createResponse({ status: 'error', message: 'Invalid grade' });
  if (!isValidClass(p.class))       return createResponse({ status: 'error', message: 'Invalid class' });
  if (!isValidNumber(p.number))     return createResponse({ status: 'error', message: 'Invalid number' });
  if (!isValidUuid(p.assessmentID)) return createResponse({ status: 'error', message: 'Invalid assessmentID' });
  if (!isValidScore(p.score))       return createResponse({ status: 'error', message: 'Invalid score' });

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(['Timestamp','Grade','Class','Number','Name','AssessmentID','Content','FileURL','Score','IsScorePublic']);
  }
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1] == p.grade && rows[i][2] == p.class &&
        rows[i][3] == p.number && rows[i][5] == p.assessmentID) {
      sheet.getRange(i + 1, 9).setValue(Number(p.score));
      return createResponse({ status: 'success' });
    }
  }
  // 제출 기록 없으면 행 생성 후 점수 입력 (만점 일괄 부여 시)
  var name = p.name || '';
  sheet.appendRow([new Date(), p.grade, p.class, p.number, name, p.assessmentID, '', '', Number(p.score), false]);
  return createResponse({ status: 'success' });
}

function handleCreateAssessment(p) {
  if (!isValidText(p.title, 100))       return createResponse({ status: 'error', message: 'Invalid title' });
  if (!isValidText(p.description, 500)) return createResponse({ status: 'error', message: 'Invalid description' });
  if (!isValidText(p.criteria, 500))    return createResponse({ status: 'error', message: 'Invalid criteria' });
  if (!isValidDeadline(p.deadline))     return createResponse({ status: 'error', message: 'Invalid deadline' });

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.ASSESSMENT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.ASSESSMENT_SHEET);
    sheet.appendRow(['ID','Title','Description','Criteria','IsPublic','CreatedAt','Deadline','Grades','Type','Questions','MaxScore','RefText','RefImageUrl']);
  }
  var id = Utilities.getUuid();
  sheet.appendRow([id, p.title, p.description, p.criteria, false, new Date(), new Date(p.deadline),
    p.grades || '', p.type || '서답형', p.questions || '[]', p.maxScore || '',
    p.refText || '', p.refImageUrl || '']);
  return createResponse({ status: 'success', id: id });
}

function handleUpdateAssessment(p) {
  if (!isValidUuid(p.id))               return createResponse({ status: 'error', message: 'Invalid id' });
  if (!isValidText(p.title, 100))       return createResponse({ status: 'error', message: 'Invalid title' });
  if (!isValidText(p.description, 500)) return createResponse({ status: 'error', message: 'Invalid description' });
  if (!isValidText(p.criteria, 500))    return createResponse({ status: 'error', message: 'Invalid criteria' });

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.ASSESSMENT_SHEET);
  if (!sheet) return createResponse({ status: 'error', message: 'No assessment sheet' });
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == p.id) {
      sheet.getRange(i + 1, 2).setValue(p.title);
      sheet.getRange(i + 1, 3).setValue(p.description);
      sheet.getRange(i + 1, 4).setValue(p.criteria);
      if (p.deadline && isValidDeadline(p.deadline)) sheet.getRange(i + 1, 7).setValue(new Date(p.deadline));
      if (p.grades !== undefined) sheet.getRange(i + 1, 8).setValue(p.grades);
      if (p.type)                 sheet.getRange(i + 1, 9).setValue(p.type);
      if (p.questions !== undefined)   sheet.getRange(i + 1, 10).setValue(p.questions);
      if (p.maxScore !== undefined)    sheet.getRange(i + 1, 11).setValue(p.maxScore);
      if (p.refText !== undefined)     sheet.getRange(i + 1, 12).setValue(p.refText);
      if (p.refImageUrl !== undefined) sheet.getRange(i + 1, 13).setValue(p.refImageUrl);
      return createResponse({ status: 'success' });
    }
  }
  return createResponse({ status: 'error', message: 'Assessment not found' });
}

function handleDeleteAssessment(p) {
  if (!isValidUuid(p.id)) return createResponse({ status: 'error', message: 'Invalid id' });
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.ASSESSMENT_SHEET);
  if (!sheet) return createResponse({ status: 'error', message: 'No assessment sheet' });
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == p.id) {
      sheet.deleteRow(i + 1);
      return createResponse({ status: 'success' });
    }
  }
  return createResponse({ status: 'error', message: 'Assessment not found' });
}

function handleUpdateDeadline(p) {
  if (!isValidUuid(p.id))           return createResponse({ status: 'error', message: 'Invalid id' });
  if (!isValidDeadline(p.deadline)) return createResponse({ status: 'error', message: 'Invalid deadline' });
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.ASSESSMENT_SHEET);
  if (!sheet) return createResponse({ status: 'error', message: 'No assessment sheet' });
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == p.id) {
      sheet.getRange(i + 1, 7).setValue(new Date(p.deadline));
      return createResponse({ status: 'success' });
    }
  }
  return createResponse({ status: 'error', message: 'Assessment not found' });
}

function handleToggleVisibility(p) {
  if (!isValidUuid(p.id)) return createResponse({ status: 'error', message: 'Invalid id' });
  var isPublic = p.isPublic === 'true';
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.ASSESSMENT_SHEET);
  if (!sheet) return createResponse({ status: 'error', message: 'No assessment sheet' });
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == p.id) {
      sheet.getRange(i + 1, 5).setValue(isPublic);
      return createResponse({ status: 'success' });
    }
  }
  return createResponse({ status: 'error' });
}

function handleToggleScorePublic(p) {
  if (!isValidGrade(p.grade))       return createResponse({ status: 'error', message: 'Invalid grade' });
  if (!isValidClass(p.class))       return createResponse({ status: 'error', message: 'Invalid class' });
  if (!isValidNumber(p.number))     return createResponse({ status: 'error', message: 'Invalid number' });
  if (!isValidUuid(p.assessmentID)) return createResponse({ status: 'error', message: 'Invalid assessmentID' });
  var isPublic = p.isPublic === 'true';
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) return createResponse({ status: 'error', message: 'No data sheet' });
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1] == p.grade && rows[i][2] == p.class &&
        rows[i][3] == p.number && rows[i][5] == p.assessmentID) {
      sheet.getRange(i + 1, 10).setValue(isPublic);
      return createResponse({ status: 'success' });
    }
  }
  return createResponse({ status: 'error', message: 'Submission not found' });
}

function handleGetMyScores(p) {
  if (!isValidGrade(p.grade))   return createResponse({ status: 'error', message: 'Invalid grade' });
  if (!isValidClass(p.class))   return createResponse({ status: 'error', message: 'Invalid class' });
  if (!isValidNumber(p.number)) return createResponse({ status: 'error', message: 'Invalid number' });
  if (!isValidName(p.name))     return createResponse({ status: 'error', message: 'Invalid name' });
  if (!isValidCode(p.code))     return createResponse({ status: 'error', message: 'Invalid code' });

  // 코드 검증
  var realCode = getOrCreateStudentCode(p.grade, p.class, p.number, p.name);
  if (p.code !== realCode) return createResponse({ status: 'error', message: '코드가 올바르지 않습니다.' });

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  // 평가 제목 맵 생성
  var assessmentTitleMap = {};
  var aSheet = ss.getSheetByName(CONFIG.ASSESSMENT_SHEET);
  if (aSheet) {
    var aRows = aSheet.getDataRange().getValues();
    var aHeaders = aRows[0];
    var idCol = aHeaders.indexOf('ID');
    var titleCol = aHeaders.indexOf('Title');
    for (var k = 1; k < aRows.length; k++) {
      assessmentTitleMap[aRows[k][idCol]] = aRows[k][titleCol];
    }
  }

  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) return createResponse([]);
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1] == p.grade && rows[i][2] == p.class &&
        rows[i][3] == p.number && rows[i][9] === true) {
      var obj = {};
      headers.forEach(function(h, j) { obj[h] = rows[i][j]; });
      obj.AssessmentTitle = assessmentTitleMap[obj.AssessmentID] || obj.AssessmentID;
      result.push(obj);
    }
  }
  return createResponse(result);
}

function handleUploadRefMaterial(p) {
  if (!p.fileData || !p.fileName || !p.mimeType)
    return createResponse({ status: 'error', message: 'Missing file data' });
  try {
    var folder = getOrCreateFolder('Performance_Assessments');
    var refFolder = getOrCreateFolder('RefMaterials', folder);
    var blob = Utilities.newBlob(Utilities.base64Decode(p.fileData), p.mimeType, p.fileName);
    var file = refFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileId = file.getId();
    // thumbnail URL은 외부 img 태그에서 표시 가능
    var imageUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1200';
    return createResponse({ status: 'success', url: imageUrl });
  } catch(err) {
    return createResponse({ status: 'error', message: err.toString() });
  }
}

function getOrCreateFolder(name, parent) {
  var base = parent || DriveApp;
  var folders = base.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return base.createFolder(name);
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
