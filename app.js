/**
 * ULTRA-FAST EXAM PREP ENGINE (Pure Vanilla JavaScript)
 * Course: Information System Services Management (MIS 17th Ed - Laudon & Laudon)
 * Features: 5-Hour Countdown, Emergency Cram Radar, Interactive Quiz,
 *           Section B Templates with KaTeX, Searchable Cheat Sheet & Storage.
 */

(function () {
  'use strict';

  // State Management
  const STATE = {
    timerSeconds: 5 * 3600,
    timerInterval: null,
    timerRunning: true,
    activeTab: 'tab-cram',
    masteredCramIds: new Set(JSON.parse(localStorage.getItem('mis_cram_mastered') || '[]')),
    studiedSecBIds: new Set(JSON.parse(localStorage.getItem('mis_secb_studied') || '[]')),
    userAnswers: {}, // { qId: selectedIndex }
    quizMistakes: new Set(),
    activeSecBId: 'secb-1',
    cramFilter: 'all',
    quizModuleFilter: 'all',
    quizMistakesOnly: false,
    glossaryCategory: 'all',
    quizStreak: 0,
    maxQuizStreak: 0
  };

  // DOM Elements Cache
  const DOM = {
    // Timer & Header
    timerDisplay: document.getElementById('timerDisplay'),
    timerStatusLabel: document.getElementById('timerStatusLabel'),
    btnTimerToggle: document.getElementById('btnTimerToggle'),
    btnTimerReset: document.getElementById('btnTimerReset'),
    btnTimerAdd15: document.getElementById('btnTimerAdd15'),
    pulseIndicator: document.getElementById('pulseIndicator'),

    // Stats
    statCramMastered: document.getElementById('statCramMastered'),
    statQuizScore: document.getElementById('statQuizScore'),
    statSecBReviewed: document.getElementById('statSecBReviewed'),
    statGlossaryCount: document.getElementById('statGlossaryCount'),

    // Tabs
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),

    // Cram Radar
    cramCardsContainer: document.getElementById('cramCardsContainer'),
    cramFilterGroup: document.getElementById('cramFilterGroup'),
    cramNeedsReviewCount: document.getElementById('cramNeedsReviewCount'),
    cramMasteredCount: document.getElementById('cramMasteredCount'),
    btnMarkAllCram: document.getElementById('btnMarkAllCram'),
    btnUnmarkAllCram: document.getElementById('btnUnmarkAllCram'),

    // Quiz
    quizQuestionsContainer: document.getElementById('quizQuestionsContainer'),
    quizLiveAccuracy: document.getElementById('quizLiveAccuracy'),
    quizLiveScore: document.getElementById('quizLiveScore'),
    quizLiveStreak: document.getElementById('quizLiveStreak'),
    quizModuleSelect: document.getElementById('quizModuleSelect'),
    chkReviewMistakesOnly: document.getElementById('chkReviewMistakesOnly'),
    quizMistakesBadge: document.getElementById('quizMistakesBadge'),
    btnResetQuiz: document.getElementById('btnResetQuiz'),

    // Section B
    secbNavList: document.getElementById('secbNavList'),
    secbActiveDisplay: document.getElementById('secbActiveDisplay'),

    // Glossary
    glossaryFilterGroup: document.getElementById('glossaryFilterGroup'),
    glossaryCardsContainer: document.getElementById('glossaryCardsContainer'),

    // Search & Modals
    globalSearchInput: document.getElementById('globalSearchInput'),
    searchModal: document.getElementById('searchModal'),
    modalSearchInput: document.getElementById('modalSearchInput'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    modalResultsList: document.getElementById('modalResultsList'),

    // Toast
    toast: document.getElementById('toastNotification'),
    toastMsg: document.getElementById('toastMsg')
  };

  // Helper: Toast Notifications
  let toastTimeout = null;
  function showToast(message, icon = '📋') {
    if (!DOM.toast) return;
    DOM.toastMsg.textContent = message;
    const toastIconEl = document.getElementById('toastIcon');
    if (toastIconEl) toastIconEl.textContent = icon;
    DOM.toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      DOM.toast.classList.remove('show');
    }, 2500);
  }

  // Helper: Copy Text to Clipboard
  function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast(successMsg, '✅'));
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast(successMsg, '✅');
    }
  }

  // KaTeX Auto-Render Invoker
  function triggerKaTeX(element) {
    if (window.renderMathInElement && element) {
      try {
        window.renderMathInElement(element, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      } catch (err) {
        console.warn('KaTeX render warning:', err);
      }
    }
  }

  /* ==========================================================================
     1. 5-HOUR ADRENALINE COUNTDOWN TIMER
     ========================================================================== */
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updateTimerUI() {
    if (!DOM.timerDisplay) return;
    DOM.timerDisplay.textContent = formatTime(STATE.timerSeconds);

    if (STATE.timerSeconds <= 3600) {
      DOM.timerStatusLabel.textContent = 'CRITICAL 1-HOUR FINAL CRAM!';
      DOM.timerStatusLabel.style.color = 'var(--accent-rose-light)';
      if (DOM.pulseIndicator) DOM.pulseIndicator.style.background = 'var(--accent-rose)';
    } else if (STATE.timerSeconds <= 7200) {
      DOM.timerStatusLabel.textContent = 'HIGH FOCUS CRAM ACTIVE';
      DOM.timerStatusLabel.style.color = 'var(--accent-amber-light)';
    } else {
      DOM.timerStatusLabel.textContent = 'EMERGENCY CRAM RADAR ACTIVE';
    }
  }

  function startTimer() {
    if (STATE.timerInterval) clearInterval(STATE.timerInterval);
    STATE.timerRunning = true;
    if (DOM.btnTimerToggle) DOM.btnTimerToggle.textContent = 'Pause';
    STATE.timerInterval = setInterval(() => {
      if (STATE.timerSeconds > 0) {
        STATE.timerSeconds--;
        updateTimerUI();
      } else {
        clearInterval(STATE.timerInterval);
        STATE.timerRunning = false;
        if (DOM.timerStatusLabel) DOM.timerStatusLabel.textContent = 'EXAM TIME - GOOD LUCK!';
        showToast('Time is up! Head to your exam room with confidence!', '🎯');
      }
    }, 1000);
  }

  function pauseTimer() {
    clearInterval(STATE.timerInterval);
    STATE.timerRunning = false;
    if (DOM.btnTimerToggle) DOM.btnTimerToggle.textContent = 'Resume';
  }

  function initTimer() {
    updateTimerUI();
    startTimer();

    if (DOM.btnTimerToggle) {
      DOM.btnTimerToggle.addEventListener('click', () => {
        if (STATE.timerRunning) pauseTimer();
        else startTimer();
      });
    }

    if (DOM.btnTimerReset) {
      DOM.btnTimerReset.addEventListener('click', () => {
        STATE.timerSeconds = 5 * 3600;
        updateTimerUI();
        if (!STATE.timerRunning) startTimer();
        showToast('Timer reset to 5:00:00', '⏱️');
      });
    }

    if (DOM.btnTimerAdd15) {
      DOM.btnTimerAdd15.addEventListener('click', () => {
        STATE.timerSeconds += 15 * 60;
        updateTimerUI();
        showToast('+15 minutes added to cram timer', '⏳');
      });
    }
  }

  /* ==========================================================================
     2. NAVIGATION TABS
     ========================================================================== */
  function switchTab(targetTabId) {
    STATE.activeTab = targetTabId;

    DOM.tabBtns.forEach(btn => {
      const isActive = btn.getAttribute('data-tab') === targetTabId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    DOM.tabContents.forEach(tab => {
      const isActive = tab.id === targetTabId;
      tab.classList.toggle('active', isActive);
    });

    // Specific triggers on tab open
    if (targetTabId === 'tab-secb') {
      renderSectionB();
    } else if (targetTabId === 'tab-glossary') {
      renderGlossary();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function initTabs() {
    DOM.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        switchTab(tabId);
      });
    });

    // Keyboard Shortcuts for tabs: 1, 2, 3, 4
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === '1') switchTab('tab-cram');
      if (e.key === '2') switchTab('tab-quiz');
      if (e.key === '3') switchTab('tab-secb');
      if (e.key === '4') switchTab('tab-glossary');
      if (e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        openSearchModal();
      }
      if (e.key === 'Escape' && DOM.searchModal && DOM.searchModal.classList.contains('open')) {
        closeSearchModal();
      }
    });
  }

  /* ==========================================================================
     3. TAB 1: 5-HOUR EMERGENCY CRAM RADAR
     ========================================================================== */
  function renderCramRadar() {
    if (!DOM.cramCardsContainer || !window.EXAM_DATA) return;
    const items = window.EXAM_DATA.cramRadar || [];

    // Filter items
    const filtered = items.filter(item => {
      const isMastered = STATE.masteredCramIds.has(item.id);
      if (STATE.cramFilter === 'mastered') return isMastered;
      if (STATE.cramFilter === 'needs-review') return !isMastered;
      return true;
    });

    // Update counts
    const masteredCount = STATE.masteredCramIds.size;
    const needsReviewCount = Math.max(0, items.length - masteredCount);
    if (DOM.cramMasteredCount) DOM.cramMasteredCount.textContent = masteredCount;
    if (DOM.cramNeedsReviewCount) DOM.cramNeedsReviewCount.textContent = needsReviewCount;
    if (DOM.statCramMastered) DOM.statCramMastered.textContent = `${masteredCount} / ${items.length}`;

    if (filtered.length === 0) {
      DOM.cramCardsContainer.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
          <span style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;">🎉</span>
          <h3 style="color: #ffffff; margin-bottom: 0.5rem;">No Topics Match This Filter!</h3>
          <p>You have mastered everything under this view or all filters are checked.</p>
        </div>
      `;
      return;
    }

    DOM.cramCardsContainer.innerHTML = filtered.map(item => {
      const isMastered = STATE.masteredCramIds.has(item.id);
      return `
        <article class="cram-card ${isMastered ? 'mastered' : ''}" id="${item.id}">
          <header class="cram-card-header">
            <div class="cram-title-row">
              <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                <span class="badge badge-purple">${item.chapter}</span>
                <span class="badge badge-cyan">${item.topic}</span>
                <span class="badge badge-amber">${item.frequency}</span>
              </div>
              <h2 class="cram-card-title">${item.title}</h2>
            </div>
            
            <label class="mastery-checkbox-label">
              <input type="checkbox" class="chk-cram-mastered" data-id="${item.id}" ${isMastered ? 'checked' : ''}>
              <span>${isMastered ? 'Mastered' : 'Mark Mastered'}</span>
            </label>
          </header>

          <!-- Why It Appears -->
          <div class="callout-box callout-amber">
            <div class="callout-header">
              <span>🎯</span> Why It Appears in the Exam
            </div>
            <div class="callout-body">${item.whyItAppears}</div>
          </div>

          <!-- Quick 30-Second Summary -->
          <div class="callout-box callout-cyan">
            <div class="callout-header">
              <span>⚡</span> Quick 30-Second Summary
            </div>
            <div class="callout-body">${item.quickSummary}</div>
          </div>

          <!-- Key Phrases for Full Credit -->
          <div class="key-phrases-box">
            <div class="key-phrases-title">
              <span>📝 Full-Credit Key Phrases & Examiner Marking Criteria</span>
              <button class="btn-action btn-copy-phrases" data-id="${item.id}" title="Copy Key Phrases">
                📋 Copy Phrases
              </button>
            </div>
            <ul class="key-phrases-list">
              ${item.keyPhrases.map(phrase => `<li>${phrase}</li>`).join('')}
            </ul>
          </div>

          <!-- Key Takeaway -->
          <div class="callout-box callout-emerald">
            <div class="callout-header">
              <span>💡</span> High-Yield Takeaway Rule
            </div>
            <div class="callout-body"><strong>${item.keyTakeaway}</strong></div>
          </div>

          <footer class="card-actions">
            <button class="btn-action btn-copy-full" data-id="${item.id}">
              📋 Copy Entire Summary
            </button>
          </footer>
        </article>
      `;
    }).join('');

    // Attach listeners
    DOM.cramCardsContainer.querySelectorAll('.chk-cram-mastered').forEach(chk => {
      chk.addEventListener('change', e => {
        const id = e.target.getAttribute('data-id');
        if (e.target.checked) {
          STATE.masteredCramIds.add(id);
          showToast('Topic marked as mastered! 🎯', '✅');
        } else {
          STATE.masteredCramIds.delete(id);
          showToast('Topic marked for review', '⚠️');
        }
        localStorage.setItem('mis_cram_mastered', JSON.stringify([...STATE.masteredCramIds]));
        renderCramRadar();
      });
    });

    DOM.cramCardsContainer.querySelectorAll('.btn-copy-phrases').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = items.find(i => i.id === id);
        if (item) {
          const text = `${item.title} - KEY EXAM PHRASES:\n` + item.keyPhrases.join('\n');
          copyToClipboard(text, 'Key phrases copied!');
        }
      });
    });

    DOM.cramCardsContainer.querySelectorAll('.btn-copy-full').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = items.find(i => i.id === id);
        if (item) {
          const text = `TOPIC: ${item.title} (${item.chapter})\n\nWHY IT APPEARS:\n${item.whyItAppears}\n\nSUMMARY:\n${item.quickSummary}\n\nKEY PHRASES:\n${item.keyPhrases.join('\n')}\n\nTAKEAWAY:\n${item.keyTakeaway}`;
          copyToClipboard(text, 'Full summary copied!');
        }
      });
    });
  }

  function initCramRadar() {
    if (DOM.cramFilterGroup) {
      DOM.cramFilterGroup.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          DOM.cramFilterGroup.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          STATE.cramFilter = btn.getAttribute('data-filter');
          renderCramRadar();
        });
      });
    }

    if (DOM.btnMarkAllCram) {
      DOM.btnMarkAllCram.addEventListener('click', () => {
        window.EXAM_DATA.cramRadar.forEach(item => STATE.masteredCramIds.add(item.id));
        localStorage.setItem('mis_cram_mastered', JSON.stringify([...STATE.masteredCramIds]));
        renderCramRadar();
        showToast('All 20 topics marked as mastered!', '🎉');
      });
    }

    if (DOM.btnUnmarkAllCram) {
      DOM.btnUnmarkAllCram.addEventListener('click', () => {
        STATE.masteredCramIds.clear();
        localStorage.setItem('mis_cram_mastered', JSON.stringify([]));
        renderCramRadar();
        showToast('Checklist reset', '🔄');
      });
    }

    renderCramRadar();
  }

  /* ==========================================================================
     4. TAB 2: RAPID-FIRE INTERACTIVE QUIZ & PAST QUESTIONS
     ========================================================================== */
  function updateQuizScoreUI() {
    const questions = window.EXAM_DATA.quizQuestions || [];
    const answeredKeys = Object.keys(STATE.userAnswers);
    let correctCount = 0;

    answeredKeys.forEach(qId => {
      const q = questions.find(item => item.id === qId);
      if (q && STATE.userAnswers[qId] === q.correctIndex) {
        correctCount++;
      }
    });

    const totalAttempted = answeredKeys.length;
    const accuracy = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;

    if (DOM.quizLiveScore) DOM.quizLiveScore.textContent = `${correctCount} / ${totalAttempted}`;
    if (DOM.quizLiveAccuracy) DOM.quizLiveAccuracy.textContent = `${accuracy}%`;
    if (DOM.quizLiveStreak) DOM.quizLiveStreak.textContent = `${STATE.quizStreak} 🔥`;
    if (DOM.statQuizScore) DOM.statQuizScore.textContent = `${correctCount}/${totalAttempted} (${accuracy}%)`;
    if (DOM.quizMistakesBadge) DOM.quizMistakesBadge.textContent = STATE.quizMistakes.size;
  }

  function renderQuiz() {
    if (!DOM.quizQuestionsContainer || !window.EXAM_DATA) return;
    const questions = window.EXAM_DATA.quizQuestions || [];

    // Filter by module and mistakes toggle
    const filtered = questions.filter(q => {
      if (STATE.quizMistakesOnly && !STATE.quizMistakes.has(q.id)) {
        return false;
      }
      if (STATE.quizModuleFilter !== 'all' && q.module !== STATE.quizModuleFilter) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      DOM.quizQuestionsContainer.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
          <span style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;">🌟</span>
          <h3 style="color: #ffffff; margin-bottom: 0.5rem;">No Questions Match Your Filter!</h3>
          <p>${STATE.quizMistakesOnly ? 'You have zero mistakes to review! Outstanding!' : 'Try selecting another module filter.'}</p>
        </div>
      `;
      return;
    }

    DOM.quizQuestionsContainer.innerHTML = filtered.map((q, idx) => {
      const answered = STATE.userAnswers[q.id] !== undefined;
      const userSelected = STATE.userAnswers[q.id];
      const isCorrect = answered && userSelected === q.correctIndex;

      return `
        <div class="quiz-card" id="${q.id}">
          <div class="quiz-card-meta">
            <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
              <span class="badge badge-purple">${q.chapter}</span>
              <span class="badge badge-cyan">${q.topic}</span>
              <span class="badge badge-amber">Q${idx + 1} of ${filtered.length}</span>
            </div>
            ${answered ? (isCorrect ? '<span class="badge badge-emerald">✓ Correct (+1)</span>' : '<span class="badge badge-rose">✕ Incorrect</span>') : ''}
          </div>

          <div class="quiz-question-text">${q.question}</div>

          <div class="quiz-options-grid">
            ${q.options.map((opt, optIdx) => {
              let optClass = '';
              if (answered) {
                if (optIdx === q.correctIndex) {
                  optClass = 'correct';
                } else if (optIdx === userSelected) {
                  optClass = 'incorrect';
                }
              }
              return `
                <button class="quiz-option-btn ${optClass}" 
                        data-qid="${q.id}" 
                        data-optidx="${optIdx}" 
                        ${answered ? 'disabled' : ''}>
                  <span>${opt}</span>
                  ${answered && optIdx === q.correctIndex ? '<span>✓</span>' : ''}
                  ${answered && optIdx === userSelected && !isCorrect ? '<span>✕</span>' : ''}
                </button>
              `;
            }).join('')}
          </div>

          <!-- Pedagogical In-Depth Explanation -->
          <div class="quiz-explanation-box ${answered ? '' : 'hidden'}">
            <div class="explanation-header">
              <span>💡</span> Pedagogical Explanation (Why Correct is Right)
            </div>
            <div class="explanation-core">${q.explanation}</div>

            <div class="distractor-analysis-title">⚠️ Distractor Analysis (Why the other options are wrong)</div>
            <ul class="distractor-list">
              ${q.distractorExplanations.map(de => `<li>${de}</li>`).join('')}
            </ul>
          </div>
        </div>
      `;
    }).join('');

    // Attach answer click listeners
    DOM.quizQuestionsContainer.querySelectorAll('.quiz-option-btn:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', e => {
        const qId = btn.getAttribute('data-qid');
        const optIdx = parseInt(btn.getAttribute('data-optidx'), 10);
        handleQuizAnswer(qId, optIdx);
      });
    });
  }

  function handleQuizAnswer(qId, selectedIdx) {
    const questions = window.EXAM_DATA.quizQuestions || [];
    const q = questions.find(item => item.id === qId);
    if (!q) return;

    STATE.userAnswers[qId] = selectedIdx;

    if (selectedIdx === q.correctIndex) {
      STATE.quizStreak++;
      if (STATE.quizStreak > STATE.maxQuizStreak) STATE.maxQuizStreak = STATE.quizStreak;
      STATE.quizMistakes.delete(qId);
      showToast(`Correct! 🔥 Streak: ${STATE.quizStreak}`, '🎯');
    } else {
      STATE.quizStreak = 0;
      STATE.quizMistakes.add(qId);
      showToast('Incorrect - Check distractor analysis below', '❌');
    }

    updateQuizScoreUI();
    renderQuiz();
  }

  function initQuiz() {
    if (DOM.quizModuleSelect) {
      DOM.quizModuleSelect.addEventListener('change', e => {
        STATE.quizModuleFilter = e.target.value;
        renderQuiz();
      });
    }

    if (DOM.chkReviewMistakesOnly) {
      DOM.chkReviewMistakesOnly.addEventListener('change', e => {
        STATE.quizMistakesOnly = e.target.checked;
        renderQuiz();
      });
    }

    if (DOM.btnResetQuiz) {
      DOM.btnResetQuiz.addEventListener('click', () => {
        if (confirm('Reset all quiz answers and score?')) {
          STATE.userAnswers = {};
          STATE.quizMistakes.clear();
          STATE.quizStreak = 0;
          updateQuizScoreUI();
          renderQuiz();
          showToast('Quiz reset', '🔄');
        }
      });
    }

    updateQuizScoreUI();
    renderQuiz();
  }

  /* ==========================================================================
     5. TAB 3: SECTION B / THEORY "FULL-CREDIT" TEMPLATES
     ========================================================================== */
  function renderSectionB() {
    if (!DOM.secbNavList || !DOM.secbActiveDisplay || !window.EXAM_DATA) return;
    const templates = window.EXAM_DATA.sectionBTemplates || [];

    // Render Sidebar Navigation
    DOM.secbNavList.innerHTML = templates.map((tmpl, idx) => {
      const isActive = tmpl.id === STATE.activeSecBId;
      const isStudied = STATE.studiedSecBIds.has(tmpl.id);
      return `
        <button class="secb-nav-item ${isActive ? 'active' : ''}" data-id="${tmpl.id}">
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${idx + 1}. ${tmpl.title.split(':')[0]}
          </span>
          <span style="font-size: 0.75rem;">${isStudied ? '✅' : '⏳'}</span>
        </button>
      `;
    }).join('');

    DOM.secbNavList.querySelectorAll('.secb-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        STATE.activeSecBId = btn.getAttribute('data-id');
        renderSectionB();
      });
    });

    // Render Active Template
    const activeTmpl = templates.find(t => t.id === STATE.activeSecBId) || templates[0];
    if (!activeTmpl) return;

    const isStudied = STATE.studiedSecBIds.has(activeTmpl.id);

    // Update stats
    if (DOM.statSecBReviewed) {
      DOM.statSecBReviewed.textContent = `${STATE.studiedSecBIds.size} / ${templates.length}`;
    }

    DOM.secbActiveDisplay.innerHTML = `
      <header class="secb-header">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
          <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap;">
            <span class="badge badge-purple">${activeTmpl.marks}</span>
            <span class="badge badge-cyan">${activeTmpl.topic}</span>
          </div>

          <label class="mastery-checkbox-label">
            <input type="checkbox" id="chkSecBStudied" ${isStudied ? 'checked' : ''}>
            <span>${isStudied ? 'Studied & Mastered' : 'Mark as Studied'}</span>
          </label>
        </div>

        <h2 class="secb-main-title">${activeTmpl.title}</h2>
      </header>

      <!-- Intuitive Concept -->
      <div class="solution-section">
        <div class="solution-section-title">
          <span>💡</span> 1. Intuitive Concept (Plain English Explanation)
        </div>
        <div class="callout-box callout-cyan">
          <div class="callout-body" style="font-size: 0.96rem;">${activeTmpl.intuitiveConcept}</div>
        </div>
      </div>

      <!-- Problem Statement / Scenario -->
      <div class="solution-section">
        <div class="solution-section-title">
          <span>📋</span> 2. Official Exam Scenario / Given Data
        </div>
        <div class="callout-box callout-amber">
          <div class="callout-body">${activeTmpl.scenario}</div>
        </div>
      </div>

      <!-- Marking Scheme Layout -->
      <div class="marking-scheme-box">
        <div class="marking-scheme-title">🎯 Marking Scheme Breakdown (How Marks Are Awarded)</div>
        <ul class="marking-scheme-list">
          ${activeTmpl.markingSchemeLayout.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>

      <!-- Exact Step-by-Step Exam Solution -->
      <div class="solution-section">
        <div class="solution-section-title">
          <span>📝</span> 3. Exact Exam Answer Booklet Template (Full Credit Layout)
        </div>
        <div class="solution-content" id="secbMathContent">
          ${activeTmpl.stepByStepSolution.replace(/\n/g, '<br>')}
        </div>
      </div>

      <!-- Examiner Advice -->
      <div class="callout-box callout-emerald" style="margin-top: 2rem;">
        <div class="callout-header">
          <span>🏆</span> Examiner Pro-Tip: How to Secure the Final Marks
        </div>
        <div class="callout-body">${activeTmpl.markerAdvice}</div>
      </div>

      <div class="card-actions" style="margin-top: 1.5rem;">
        <button class="btn-action" id="btnCopySecB">
          📋 Copy Entire Answer Template
        </button>
      </div>
    `;

    // KaTeX formula render on the math content container
    const mathContent = document.getElementById('secbMathContent');
    if (mathContent) triggerKaTeX(mathContent);

    // Studied checkbox listener
    const chk = document.getElementById('chkSecBStudied');
    if (chk) {
      chk.addEventListener('change', e => {
        if (e.target.checked) {
          STATE.studiedSecBIds.add(activeTmpl.id);
          showToast('Template marked as studied!', '✅');
        } else {
          STATE.studiedSecBIds.delete(activeTmpl.id);
          showToast('Template marked unstudied', '⚠️');
        }
        localStorage.setItem('mis_secb_studied', JSON.stringify([...STATE.studiedSecBIds]));
        renderSectionB();
      });
    }

    // Copy template listener
    const btnCopy = document.getElementById('btnCopySecB');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        const text = `EXAM TEMPLATE: ${activeTmpl.title}\n\nSCENARIO:\n${activeTmpl.scenario}\n\nSOLUTION:\n${activeTmpl.stepByStepSolution}`;
        copyToClipboard(text, 'Full Section B template copied!');
      });
    }
  }

  /* ==========================================================================
     6. TAB 4: SEARCHABLE CHEAT SHEET & GLOSSARY
     ========================================================================== */
  function renderGlossary() {
    if (!DOM.glossaryCardsContainer || !window.EXAM_DATA) return;
    const items = window.EXAM_DATA.glossaryAndFormulas || [];

    const filtered = items.filter(item => {
      if (STATE.glossaryCategory !== 'all' && item.category !== STATE.glossaryCategory) {
        return false;
      }
      return true;
    });

    if (DOM.statGlossaryCount) {
      DOM.statGlossaryCount.textContent = items.length;
    }

    DOM.glossaryCardsContainer.innerHTML = filtered.map(item => `
      <article class="glossary-card">
        <div>
          <div class="glossary-header">
            <h3 class="glossary-term">${item.term}</h3>
            <span class="badge badge-purple">${item.acronym}</span>
          </div>

          <span class="badge badge-cyan" style="margin-bottom: 0.75rem; align-self: flex-start;">${item.category}</span>

          <p class="glossary-def">${item.definition}</p>

          ${item.formula ? `
            <div class="glossary-formula-box">
              <span style="font-weight: 700; color: #ffffff; display: block; font-size: 0.75rem; margin-bottom: 0.25rem;">FORMULA / MODEL:</span>
              $$${item.formula}$$
            </div>
          ` : ''}

          <div class="glossary-tip">
            <strong>Exam Tip:</strong> ${item.examTip}
          </div>
        </div>

        <footer class="glossary-footer">
          <button class="btn-action btn-copy-glossary" data-term="${item.term}">
            📋 Copy Term & Formula
          </button>
        </footer>
      </article>
    `).join('');

    // Trigger KaTeX rendering
    triggerKaTeX(DOM.glossaryCardsContainer);

    // Copy listener
    DOM.glossaryCardsContainer.querySelectorAll('.btn-copy-glossary').forEach(btn => {
      btn.addEventListener('click', () => {
        const termName = btn.getAttribute('data-term');
        const item = items.find(i => i.term === termName);
        if (item) {
          const text = `${item.term} (${item.acronym}):\n${item.definition}\n${item.formula ? `Formula: ${item.formula}\n` : ''}Exam Tip: ${item.examTip}`;
          copyToClipboard(text, `${item.acronym} copied!`);
        }
      });
    });
  }

  function initGlossary() {
    if (DOM.glossaryFilterGroup) {
      DOM.glossaryFilterGroup.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          DOM.glossaryFilterGroup.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          STATE.glossaryCategory = btn.getAttribute('data-category');
          renderGlossary();
        });
      });
    }
    renderGlossary();
  }

  /* ==========================================================================
     7. GLOBAL SEARCH SYSTEM & MODAL
     ========================================================================== */
  function openSearchModal(initialQuery = '') {
    if (!DOM.searchModal) return;
    DOM.searchModal.classList.add('open');
    if (DOM.modalSearchInput) {
      DOM.modalSearchInput.value = initialQuery;
      DOM.modalSearchInput.focus();
      if (initialQuery.trim().length >= 2) performSearch(initialQuery);
    }
  }

  function closeSearchModal() {
    if (!DOM.searchModal) return;
    DOM.searchModal.classList.remove('open');
  }

  function performSearch(query) {
    if (!DOM.modalResultsList || !window.EXAM_DATA) return;
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      DOM.modalResultsList.innerHTML = `
        <p style="color: var(--text-dim); font-size: 0.9rem; text-align: center; padding: 2rem 0;">Type at least 2 characters to search everything...</p>
      `;
      return;
    }

    const results = [];

    // Search Cram Radar
    window.EXAM_DATA.cramRadar.forEach(item => {
      const match = item.title.toLowerCase().includes(q) ||
                    item.quickSummary.toLowerCase().includes(q) ||
                    item.keyPhrases.some(p => p.toLowerCase().includes(q));
      if (match) {
        results.push({
          type: '🚨 Cram Radar',
          title: item.title,
          snippet: item.quickSummary.substring(0, 140) + '...',
          tabId: 'tab-cram',
          targetId: item.id
        });
      }
    });

    // Search Quiz Questions
    window.EXAM_DATA.quizQuestions.forEach(item => {
      const match = item.question.toLowerCase().includes(q) ||
                    item.explanation.toLowerCase().includes(q) ||
                    item.options.some(o => o.toLowerCase().includes(q));
      if (match) {
        results.push({
          type: '⚡ Past MCQ',
          title: `${item.chapter}: ${item.topic}`,
          snippet: item.question.substring(0, 140) + '...',
          tabId: 'tab-quiz',
          targetId: item.id
        });
      }
    });

    // Search Section B Templates
    window.EXAM_DATA.sectionBTemplates.forEach(item => {
      const match = item.title.toLowerCase().includes(q) ||
                    item.scenario.toLowerCase().includes(q) ||
                    item.stepByStepSolution.toLowerCase().includes(q);
      if (match) {
        results.push({
          type: '✍️ Section B Template',
          title: item.title,
          snippet: item.scenario.substring(0, 140) + '...',
          tabId: 'tab-secb',
          targetId: item.id,
          secbId: item.id
        });
      }
    });

    // Search Glossary
    window.EXAM_DATA.glossaryAndFormulas.forEach(item => {
      const match = item.term.toLowerCase().includes(q) ||
                    item.acronym.toLowerCase().includes(q) ||
                    item.definition.toLowerCase().includes(q);
      if (match) {
        results.push({
          type: '📖 Cheat Sheet / Formula',
          title: `${item.term} (${item.acronym})`,
          snippet: item.definition.substring(0, 140) + '...',
          tabId: 'tab-glossary',
          targetId: null
        });
      }
    });

    if (results.length === 0) {
      DOM.modalResultsList.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-dim);">
          <span style="font-size: 2rem; display: block; margin-bottom: 0.5rem;">🔍</span>
          <p>No results found for "<strong>${escapeHtml(query)}</strong>"</p>
        </div>
      `;
      return;
    }

    DOM.modalResultsList.innerHTML = results.map(r => `
      <div class="modal-result-item" data-tab="${r.tabId}" data-target="${r.targetId || ''}" data-secbid="${r.secbId || ''}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
          <span class="modal-result-title">${r.title}</span>
          <span class="badge badge-purple" style="font-size: 0.7rem;">${r.type}</span>
        </div>
        <p class="modal-result-snippet">${r.snippet}</p>
      </div>
    `).join('');

    DOM.modalResultsList.querySelectorAll('.modal-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const tabId = el.getAttribute('data-tab');
        const targetId = el.getAttribute('data-target');
        const secbId = el.getAttribute('data-secbid');

        closeSearchModal();
        switchTab(tabId);

        if (secbId) {
          STATE.activeSecBId = secbId;
          renderSectionB();
        }

        setTimeout(() => {
          if (targetId) {
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
              targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              targetEl.style.outline = '2px solid var(--accent-cyan)';
              setTimeout(() => { targetEl.style.outline = 'none'; }, 2000);
            }
          }
        }, 200);
      });
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  function initSearch() {
    if (DOM.globalSearchInput) {
      DOM.globalSearchInput.addEventListener('click', () => openSearchModal());
      DOM.globalSearchInput.addEventListener('input', e => {
        openSearchModal(e.target.value);
        e.target.value = '';
      });
    }

    if (DOM.modalSearchInput) {
      DOM.modalSearchInput.addEventListener('input', e => {
        performSearch(e.target.value);
      });
    }

    if (DOM.btnCloseModal) {
      DOM.btnCloseModal.addEventListener('click', closeSearchModal);
    }

    if (DOM.searchModal) {
      DOM.searchModal.addEventListener('click', e => {
        if (e.target === DOM.searchModal) closeSearchModal();
      });
    }
  }

  /* ==========================================================================
     APP INITIALIZATION
     ========================================================================== */
  function initApp() {
    console.log('⚡ Initializing MIS Exam Prep Engine...');
    initTimer();
    initTabs();
    initCramRadar();
    initQuiz();
    initSectionB();
    initGlossary();
    initSearch();
    console.log('✅ MIS Exam Prep Engine Ready!');
  }

  function initSectionB() {
    renderSectionB();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
