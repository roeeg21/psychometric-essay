import React, { useState, useEffect, useRef } from 'react';
import './PsychometricTest.css';

function PsychometricTest() {
  // State management
  const [screen, setScreen] = useState('home'); // 'home' or 'writing'
  const [extraTime, setExtraTime] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(30);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60);
  const [text, setText] = useState('');
  const [copiedText, setCopiedText] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [lineCount, setLineCount] = useState(0);
  const [minLines] = useState(25);
  const [maxLines] = useState(50);
  const [hardLimit] = useState(55);
  const [charLimit] = useState(100); // Character limit per line

  const writingAreaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Update total time when extra time changes
  useEffect(() => {
    const cappedExtra = Math.min(extraTime, 120);
    setTotalMinutes(30 + cappedExtra);
    setTimeRemaining((30 + cappedExtra) * 60);
  }, [extraTime]);

  // Timer effect
  useEffect(() => {
    if (screen === 'writing' && !isLocked) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleLockWriting();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timerIntervalRef.current);
    }
  }, [screen, isLocked]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Start test
  const handleStartTest = () => {
    setScreen('writing');
    localStorage.removeItem('psychometric_autosave');
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && screen === 'home') {
        handleStartTest();
      }
      // Disable keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key)) {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [screen]);

  // Break text into lines with character limit
  const breakTextIntoLines = (inputText) => {
    if (!inputText) return [];

    const lines = [];
    const paragraphs = inputText.split('\n');

    paragraphs.forEach(paragraph => {
      if (!paragraph.trim()) {
        lines.push('');
        return;
      }

      const words = paragraph.split(' ');
      let currentLine = '';

      words.forEach(word => {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        
        // If adding this word exceeds the character limit
        if (testLine.length > charLimit) {
          // If current line has content, push it and start new line with the word
          if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            // Single word exceeds limit, force break it
            lines.push(word);
            currentLine = '';
          }
        } else {
          currentLine = testLine;
        }
      });

      // Push remaining content
      if (currentLine) {
        lines.push(currentLine);
      }
    });

    return lines;
  };

  // Count lines and update line numbers
  const updateLineNumbers = () => {
    if (!writingAreaRef.current) return;

    const currentText = writingAreaRef.current.value;

    if (!currentText) {
      setLineCount(0);
      if (lineNumbersRef.current) {
        lineNumbersRef.current.innerHTML = '';
      }
      return;
    }

    const lines = breakTextIntoLines(currentText);
    setLineCount(lines.length);

    // Update line numbers display
    if (lineNumbersRef.current) {
      lineNumbersRef.current.innerHTML = '';
      for (let i = 1; i <= lines.length; i++) {
        const lineNum = document.createElement('div');
        lineNum.className = 'line-number';
        lineNum.textContent = i;
        lineNumbersRef.current.appendChild(lineNum);
      }
    }
  };

  // Handle text change
  const handleTextChange = (e) => {
    const newText = e.target.value;
    
    // Check line count with character limit
    const lines = breakTextIntoLines(newText);

    // Enforce hard limit
    if (lines.length > hardLimit) {
      return; // Don't allow the change
    }

    setText(newText);
    setTimeout(updateLineNumbers, 0);
    
    // Autosave
    if (!isLocked) {
      localStorage.setItem('psychometric_autosave', JSON.stringify({
        text: newText,
        timeRemaining,
        timestamp: Date.now()
      }));
    }
  };

  // Get actual rendered lines
  const getTextLines = () => {
    return breakTextIntoLines(text);
  };

  // Count words in a line
  const countWordsInLine = (line) => {
    if (!line.trim()) return 0;
    return line.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Lock writing and show results
  const handleLockWriting = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsLocked(true);
    localStorage.removeItem('psychometric_autosave');
    setShowResults(true);
  };

  // Handle finish button
  const handleFinish = () => {
    if (window.confirm('האם אתה בטוח שברצונך לסיים את הכתיבה? לא תוכל לערוך יותר.')) {
      handleLockWriting();
    }
  };

  // Toolbar functions
  const [hasSelection, setHasSelection] = useState(false);

  const handleSelection = () => {
    if (!writingAreaRef.current) return;
    const hasText = writingAreaRef.current.selectionStart !== writingAreaRef.current.selectionEnd;
    setHasSelection(hasText);
  };

  const handleCopy = () => {
    if (!writingAreaRef.current) return;
    const start = writingAreaRef.current.selectionStart;
    const end = writingAreaRef.current.selectionEnd;
    setCopiedText(text.substring(start, end));
  };

  const handlePaste = () => {
    if (!copiedText || !writingAreaRef.current) return;
    const start = writingAreaRef.current.selectionStart;
    const end = writingAreaRef.current.selectionEnd;
    const newText = text.substring(0, start) + copiedText + text.substring(end);
    
    // Check if paste would exceed limit
    const e = { target: { value: newText } };
    handleTextChange(e);
    
    writingAreaRef.current.selectionStart = writingAreaRef.current.selectionEnd = start + copiedText.length;
    writingAreaRef.current.focus();
  };

  const handleUnderline = () => {
    if (!writingAreaRef.current) return;
    const start = writingAreaRef.current.selectionStart;
    const end = writingAreaRef.current.selectionEnd;
    const selectedText = text.substring(start, end);
    const underlinedText = `_${selectedText}_`;
    const newText = text.substring(0, start) + underlinedText + text.substring(end);
    
    setText(newText);
    setTimeout(() => {
      writingAreaRef.current.selectionStart = start;
      writingAreaRef.current.selectionEnd = start + underlinedText.length;
      writingAreaRef.current.focus();
      updateLineNumbers();
    }, 0);
  };

  // Calculate results
  const getResults = () => {
    const lines = getTextLines();
    let totalWords = 0;
    const lineWordCounts = lines.map((line, index) => {
      const words = countWordsInLine(line);
      totalWords += words;
      return {
        lineNumber: index + 1,
        wordCount: words,
        charCount: line.length
      };
    });

    return { lines: lines.length, totalWords, lineWordCounts };
  };

  // Get line limit status
  const getLineLimitStatus = () => {
    if (lineCount < minLines) {
      return { color: 'warning', text: `מינימום ${minLines} שורות נדרש` };
    } else if (lineCount >= minLines && lineCount <= maxLines) {
      return { color: 'success', text: 'טווח תקין' };
    } else if (lineCount > maxLines && lineCount <= hardLimit) {
      return { color: 'warning', text: `חריגה מהמקסימום (${maxLines} שורות)` };
    } else {
      return { color: 'error', text: 'הגעת למגבלה המקסימלית!' };
    }
  };

  const results = showResults ? getResults() : null;
  const limitStatus = getLineLimitStatus();

  return (
    <div className="psychometric-test">
      {/* Home Screen */}
      {screen === 'home' && (
        <div className="home-screen">
          <div className="home-content">
            <h1 className="home-title">דף זה מדמה את תוכנת הכתיבת החיבור בפסיכומטרי</h1>
            
            <div className="input-group">
              <label htmlFor="extraTime" className="input-label">
                כמה תוספת זמן קיבלת לחיבור? (בדקות)
              </label>
              <input 
                type="number" 
                id="extraTime" 
                className="time-input" 
                value={extraTime} 
                onChange={(e) => setExtraTime(Math.max(0, parseInt(e.target.value) || 0))}
                min="0" 
                step="1"
                placeholder="הזן דקות"
              />
              <div className="calculated-time">
                זמן כולל למבחן: <strong>{formatTime(timeRemaining)}</strong>
              </div>
            </div>

            <div className="line-limit-info">
              <p>מגבלות:</p>
              <ul>
                <li>מינימום: {minLines} שורות</li>
                <li>מומלץ: {minLines}-{maxLines} שורות</li>
                <li>מקסימום מוחלט: {hardLimit} שורות</li>
                <li>מקסימום תווים בשורה: {charLimit}</li>
              </ul>
            </div>

            <button className="start-button" onClick={handleStartTest}>
              לחץ Enter להתחלת הכתיבה
            </button>
            
            <p className="info-text">לאחר ההתחלה, הטיימר יתחיל לספור לאחור מיידית</p>
          </div>
          
          <footer className="footer">
            <p>© {new Date().getFullYear()} Roee Getz. All rights reserved.</p>
          </footer>
        </div>
      )}

      {/* Writing Screen */}
      {screen === 'writing' && (
        <div className="writing-screen">
          <div className="toolbar">
            <div className="toolbar-left">
              <button 
                className="toolbar-button" 
                disabled={!hasSelection || isLocked}
                onClick={handleCopy}
              >
                העתק
              </button>
              <button 
                className="toolbar-button" 
                disabled={!copiedText || isLocked}
                onClick={handlePaste}
              >
                הדבק
              </button>
              <button 
                className="toolbar-button" 
                disabled={!hasSelection || isLocked}
                onClick={handleUnderline}
              >
                קו תחתון
              </button>
            </div>
            <div className="toolbar-right">
              <button 
                className="finish-button" 
                disabled={isLocked}
                onClick={handleFinish}
              >
                סיים כתיבה
              </button>
              <div className={`timer ${timeRemaining <= 300 && timeRemaining > 0 ? 'warning' : ''}`}>
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>

          <div className="writing-container">
            <div className="paper">
              <div className="line-numbers" ref={lineNumbersRef}></div>
              <div className="writing-area-container">
                <textarea 
                  ref={writingAreaRef}
                  className="writing-area no-context-menu" 
                  value={text}
                  onChange={handleTextChange}
                  onSelect={handleSelection}
                  onMouseUp={handleSelection}
                  onKeyUp={handleSelection}
                  onContextMenu={(e) => e.preventDefault()}
                  placeholder="התחל לכתוב כאן..."
                  spellCheck="false"
                  disabled={isLocked}
                />
              </div>
              <div className={`line-status ${limitStatus.color}`}>
                <div>שורות: <strong>{lineCount}</strong></div>
                <div className="status-text">{limitStatus.text}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResults && results && (
        <div className="results-modal active">
          <div className="results-content">
            <h2>תוצאות כתיבה</h2>
            <div className="results-summary">
              <div>סך הכל שורות: <strong>{results.lines}</strong></div>
              <div>סך הכל מילים: <strong>{results.totalWords}</strong></div>
              <div className={results.lines < minLines ? 'warning-text' : results.lines > maxLines ? 'warning-text' : 'success-text'}>
                {results.lines < minLines && `חסרות ${minLines - results.lines} שורות להשלמת המינימום`}
                {results.lines >= minLines && results.lines <= maxLines && 'הטקסט בטווח המומלץ'}
                {results.lines > maxLines && results.lines <= hardLimit && `חריגה של ${results.lines - maxLines} שורות מעל המומלץ`}
                {results.lines > hardLimit && 'חריגה מהמגבלה המקסימלית!'}
              </div>
            </div>
            <div className="line-results">
              <h3>מילים ותווים בכל שורה:</h3>
              <div className="line-results-list">
                {results.lineWordCounts.map(item => (
                  <div key={item.lineNumber} className="line-result-item">
                    <span className="line-num">שורה {item.lineNumber}</span>
                    <span className="word-count">{item.wordCount} מילים</span>
                    <span className="char-count">({item.charCount} תווים)</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="results-actions">
              <button onClick={() => window.location.reload()}>חזרה לדף הבית</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PsychometricTest;