function QuizApp() {
  this.data = {
    currentPage: 'home', // 從 'topics' 改為 'home'
    quizData: null,
    currentTopic: null,
    currentRound: 1,
    currentQuestion: 0,
    selectedAnswer: null,
    showFeedback: false,
    isCorrect: false,
    wrongQuestions: [],
    correctAnswers: 0,
    quizComplete: false,
    showExplanation: false,
    isReviewingWrongQuestions: false,
    completedRounds: {}
  };
  this.init();
}

QuizApp.prototype.init = function() {
  try {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) loadingElement.style.display = 'block';

    // 只保留必要的動態樣式，其他移到 Styles.html
    const additionalStyles = `
      /* 動畫效果 */
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fadeIn {
        animation: fadeIn 0.5s ease-out forwards;
      }
      
      /* 新項目進入動畫 */
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      .options-grid .option:nth-child(1) { animation: slideIn 0.3s ease-out 0.05s both; }
      .options-grid .option:nth-child(2) { animation: slideIn 0.3s ease-out 0.1s both; }
      .options-grid .option:nth-child(3) { animation: slideIn 0.3s ease-out 0.15s both; }
      .options-grid .option:nth-child(4) { animation: slideIn 0.3s ease-out 0.2s both; }
      .options-grid .option:nth-child(5) { animation: slideIn 0.3s ease-out 0.25s both; }
      
      /* 載入畫面樣式 */
      #loading {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        font-size: 1.2rem;
        color: var(--brand-primary);
      }
      
      .loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        animation: pulse 1.5s infinite;
      }
      
      @keyframes pulse {
        0% { opacity: 0.7; }
        50% { opacity: 1; }
        100% { opacity: 0.7; }
      }

      /* 固定頭部樣式 */
      .fixed-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        background-color: white;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        padding: 10px 0;
      }
      
      .header-spacer {
        height: 70px;
      }
    `;

    // 建立並新增樣式元素
    const styleElement = document.createElement('style');
    styleElement.textContent = additionalStyles;
    document.head.appendChild(styleElement);

    // 新增關閉確認
    window.addEventListener('beforeunload', function (e) {
      // 如果正在進行測驗（不在首頁），則顯示警告
      e.preventDefault();
      e.returnValue = '要離開網站嗎？';
      return '要離開網站嗎？';
    });

    this.loadQuizData();
  } catch (error) {
    console.error('初始化錯誤:', error);
    alert('載入資料時發生錯誤，請重新整理頁面。');
  }
};

QuizApp.prototype.loadQuizData = function() {
    const self = this;
    console.log('開始載入本地資料...');

    // 直接從本地檔案讀取資料
    this.loadLocalExcelData()
        .then(function(data) {
            console.log('載入資料成功:', data);
            self.data.quizData = data;
            self.render();
            const loadingElement = document.getElementById('loading');
            if (loadingElement) loadingElement.style.display = 'none';
        })
        .catch(function(error) {
            console.error('載入資料失敗:', error);
            alert('載入資料失敗：' + error);
            const loadingElement = document.getElementById('loading');
            if (loadingElement) loadingElement.style.display = 'none';
        });
};

QuizApp.prototype.loadLocalExcelData = async function() {
    try {
        console.log('嘗試讀取 Excel 檔案...');
        
        // 檢查 fetch 是否可用
        if (typeof fetch === 'undefined') {
            throw new Error('瀏覽器不支援 fetch API');
        }
        
        // 嘗試讀取檔案
        console.log('正在請求: ./data/活頁簿1.xlsx');
        const response = await fetch('./data/活頁簿1.xlsx');
        
        // 檢查回應狀態
        if (!response.ok) {
            console.error('檔案請求失敗:', response.status, response.statusText);
            
            if (response.status === 404) {
                throw new Error('找不到 Excel 檔案，請確認 data/活頁簿1.xlsx 檔案存在');
            } else if (response.status === 0) {
                throw new Error('CORS 錯誤：請使用 HTTP 伺服器開啟網頁，不要直接開啟 HTML 檔案');
            } else {
                throw new Error(`HTTP 錯誤 ${response.status}: ${response.statusText}`);
            }
        }
        
        console.log('檔案請求成功，正在讀取內容...');
        const arrayBuffer = await response.arrayBuffer();
        console.log('檔案大小:', arrayBuffer.byteLength, 'bytes');
        
        if (arrayBuffer.byteLength === 0) {
            throw new Error('Excel 檔案是空的');
        }
        
        // 動態載入 SheetJS
        if (typeof XLSX === 'undefined') {
            console.log('載入 SheetJS...');
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
            
            // 等待一下確保載入完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (typeof XLSX === 'undefined') {
                throw new Error('無法載入 SheetJS 函式庫');
            }
            console.log('SheetJS 載入成功');
        }
        
        console.log('解析 Excel 檔案...');
        // 解析 Excel 檔案
        const workbook = XLSX.read(arrayBuffer, {
            type: 'array',
            cellDates: true,
            cellStyles: false
        });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('Excel 檔案中沒有工作表');
        }
        
        console.log('工作表:', workbook.SheetNames);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        if (!worksheet) {
            throw new Error('無法讀取第一個工作表');
        }
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: null,
            raw: false
        });
        
        console.log('讀取到', jsonData.length, '行資料');
        
        if (jsonData.length < 2) {
            throw new Error('Excel 檔案中的資料不足（至少需要標題行和一行資料）');
        }
        
        // 處理資料格式，轉換為原本的格式
        const result = this.convertExcelDataToQuizFormat(jsonData);
        console.log('資料轉換完成');
        
        return result;
        
    } catch (error) {
        console.error('讀取 Excel 檔案時發生詳細錯誤:', error);
        
        // 提供更友善的錯誤訊息
        let friendlyMessage = '載入資料時發生錯誤：\n\n';
        
        if (error.message.includes('CORS')) {
            friendlyMessage += '🚫 安全限制錯誤\n\n';
            friendlyMessage += '請使用以下方法之一：\n';
            friendlyMessage += '1. 使用 HTTP 伺服器開啟網頁\n';
            friendlyMessage += '   - python -m http.server 8000\n';
            friendlyMessage += '   - 然後開啟 http://localhost:8000\n\n';
            friendlyMessage += '2. 或上傳到 GitHub Pages\n';
            friendlyMessage += '3. 或使用其他網頁伺服器';
        } else if (error.message.includes('找不到')) {
            friendlyMessage += '📁 檔案路徑錯誤\n\n';
            friendlyMessage += '請確認：\n';
            friendlyMessage += '1. data/ 資料夾存在\n';
            friendlyMessage += '2. 活頁簿1.xlsx 檔案在 data/ 資料夾中\n';
            friendlyMessage += '3. 檔案名稱完全正確（包含中文字）';
        } else if (error.message.includes('SheetJS')) {
            friendlyMessage += '📚 函式庫載入錯誤\n\n';
            friendlyMessage += '請檢查網路連線，SheetJS 函式庫無法載入';
        } else {
            friendlyMessage += '❌ 其他錯誤\n\n';
            friendlyMessage += error.message;
        }
        
        throw new Error(friendlyMessage);
    }
};

// 改進的腳本載入函數
QuizApp.prototype.loadScript = function(src) {
    return new Promise((resolve, reject) => {
        // 檢查是否已經載入
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            console.log('腳本載入成功:', src);
            resolve();
        };
        script.onerror = (error) => {
            console.error('腳本載入失敗:', src, error);
            reject(new Error(`無法載入腳本: ${src}`));
        };
        document.head.appendChild(script);
    });
};

// 將 Excel 資料轉換為原本的題目格式
QuizApp.prototype.convertExcelDataToQuizFormat = function(data) {
    const questions = {};
    const rows = data.slice(1); // 跳過標題行
    
    rows.forEach((row, index) => {
        try {
            if (!row[0]) return; // 跳過空行
            
            // 解析單元資訊 (欄位 0: "01 實數")
            const unitInfo = String(row[0]).split(' ');
            const unitNumber = parseInt(unitInfo[0]);
            const unitName = unitInfo.slice(1).join(' ');  
            const unitKey = `單元${String(unitNumber).padStart(2, '0')} ${unitName}`;
            
            // 回次 (欄位 1)
            const round = parseInt(row[1]);
            
            // 題號 (欄位 2) 
            const questionNum = parseInt(row[2]);
            
            // 題目類型 (欄位 3)
            const questionType = row[3];
            
            // 初始化單元和回次
            if (!questions[unitKey]) {
                questions[unitKey] = {};
            }
            if (!questions[unitKey][round]) {
                questions[unitKey][round] = [];
            }
            
            // 建立題目物件
            const question = {
                id: `${unitNumber}-${round}-${questionNum}`,
                type: questionType,
                questionImage: this.processLocalImageField(row[4], row[5]), // 題目圖檔和ID
                correctAnswer: row[16] ? String(row[16]).trim() : '', // 答案
                explanationImage: this.processLocalImageField(row[17], row[18]), // 解析圖檔和ID
                options: []
            };
            
            // 處理選項
            if (questionType === 'A') {
                // 是非題
                question.options = [
                    { value: '1', text: 'O' },
                    { value: '2', text: 'X' }
                ];
            } else if (questionType === 'B') {
                // 選擇題 - 處理 5 個選項
                const options = [];
                for (let i = 0; i < 5; i++) {
                    const optionImgField = row[6 + i * 2];     // 選項圖檔名
                    const optionIdField = row[7 + i * 2];      // 選項Drive ID
                    
                    if (optionImgField || optionIdField) {
                        const option = {
                            value: optionIdField || '', // 使用 Drive ID 作為值
                            image: null,
                            text: null
                        };
                        
                        // 如果有圖檔名，表示這是圖片選項
                        if (optionImgField && optionImgField.includes('.png')) {
                            option.image = this.getLocalImageUrl(optionIdField, 'option');
                            option.text = '';
                        } else {
                            // 文字選項
                            option.text = optionIdField ? String(optionIdField) : '';
                        }
                        
                        options.push(option);
                    }
                }
                question.options = options;
            }
            
            questions[unitKey][round].push(question);
            
        } catch (error) {
            console.error(`處理第 ${index + 2} 行資料時發生錯誤:`, error);
        }
    });
    
    return { questions: questions };
};

// 處理本地圖片欄位
QuizApp.prototype.processLocalImageField = function(imageField, idField) {
    // 如果有圖檔名且包含 .png，返回本地圖片路徑
    if (imageField && typeof imageField === 'string' && imageField.includes('.png')) {
        return this.getLocalImageUrl(idField, 'question');
    }
    // 否則返回文字內容
    return idField ? String(idField) : '';
};

// 取得本地圖片 URL
QuizApp.prototype.getLocalImageUrl = function(driveId, type = 'question') {
    if (!driveId) return null;
    
    // 如果您想繼續使用 Google Drive (推薦，因為更簡單)
    const sizeParam = type === 'option' ? 'h60' : 'w500';
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=${sizeParam}`;
};

QuizApp.prototype.navigateTo = function(page) {
  this.data.currentPage = page;
  this.render();
};

QuizApp.prototype.selectTopic = function(topic) {
  this.data.currentTopic = topic;
  const completedRounds = this.getCompletedRoundsCount(topic);
  this.data.currentPage = 'quiz';
  this.data.currentRound = 1;
  this.data.currentQuestion = 0;
  this.data.correctAnswers = 0;
  this.data.wrongQuestions = [];
  this.data.quizComplete = false;
  this.data.selectedAnswer = null;
  this.data.showFeedback = false;
  this.data.showExplanation = false;
  this.data.isReviewingWrongQuestions = false;
  
  // 對所有題目的選項進行隨機排序
  this.randomizeAllOptions();
  
  if (completedRounds > 0) {
    // 如果有完成的回合，顯示選擇頁面
    this.data.currentPage = 'roundSelection';
  } else {
    // 如果沒有完成的回合，直接開始第一回合
    this.startNewRound(1);
  }

  this.render();
};

// 添加開始回合的函數
QuizApp.prototype.startNewRound = function(round) {
  this.data.currentPage = 'quiz';
  this.data.currentRound = round;
  this.data.currentQuestion = 0;
  this.data.correctAnswers = 0;
  this.data.wrongQuestions = [];
  this.data.quizComplete = false;
  this.data.selectedAnswer = null;
  this.data.showFeedback = false;
  this.data.showExplanation = false;
  this.data.isReviewingWrongQuestions = false;
  this.randomizeAllOptions();
  this.render();
};

// 添加固定頭部渲染函數
QuizApp.prototype.renderFixedHeader = function() {
  return `
  <div class="fixed-header">
    <div style="text-align: center; width: 100%; max-width: 500px; margin: 0 auto; background-color: white; padding: 5px;">
      <div style="position: relative; display: inline-block;">
        <img src="https://hackmd.io/_uploads/HkWcT8hcyl.png" alt="數學你多會" style="max-width: 120px; height: auto;">
        <span style="position: absolute; top: 0px; right: -50px; background: linear-gradient(to right, #FF87B0, #FFB347); color: white; font-weight: bold; padding: 4px 10px; border-radius: 12px; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">B1</span>
      </div>
    </div>
  </div>
  <div class="header-spacer"></div>
  `;
};

// 添加回合選擇頁面的渲染函數
QuizApp.prototype.renderRoundSelection = function() {
  const completedRounds = this.getCompletedRoundsCount(this.data.currentTopic);
  const nextRound = completedRounds + 1;

  return `
  <div class="container animate-fadeIn">
    <div class="card">
      <div class="welcome-text">
        <h2 class="text-center mb-4">${this.data.currentTopic}</h2>
        <p class="text-center mb-4">您上次已完成了 ${completedRounds} 回合的練習，要從哪裡開始呢？</p>
      </div>

      <div class="grid">
        ${nextRound <= 3 ? `
          <button onclick="app.startNewRound(${nextRound})" class="btn btn-primary">
            從第 ${nextRound} 回合繼續
          </button>
        ` : ''}

        <button onclick="app.startNewRound(1)" class="btn" style="background: linear-gradient(135deg, #4CAF50, #8BC34A);">
          重新開始練習
        </button>

        <button onclick="app.navigateTo('topics')" class="btn btn-default">
          返回單元選擇
        </button>
      </div>
    </div>
  </div>
  `;
};

QuizApp.prototype.randomizeAllOptions = function() {
  if (!this.data.quizData?.questions?.[this.data.currentTopic]) return;
  
  console.log('隨機排序所有選項...');
  
  // 對每一回合的題目進行處理
  Object.values(this.data.quizData.questions[this.data.currentTopic]).forEach(roundQuestions => {
    roundQuestions.forEach(question => {
      // 只對選擇題且選項數量大於2的題目進行隨機排序
      if (question.type === 'B' && question.options.length > 2) {
        const originalOptions = [...question.options];
        
        // 深度複製選項以避免引用問題
        const clonedOptions = originalOptions.map(option => ({...option}));
        
        // 確保徹底隨機化
        let shuffledOptions;
        let isSameOrder = true;
        
        // 嘗試幾次隨機排序，直到順序與原始順序不同
        for (let attempts = 0; attempts < 5 && isSameOrder; attempts++) {
          shuffledOptions = this.shuffleArray([...clonedOptions]);
          
          // 檢查排序後的順序是否與原始順序相同
          isSameOrder = shuffledOptions.every((option, index) => 
            option.value === originalOptions[index].value
          );
        }
        
        question.options = shuffledOptions;
      }
    });
  });
};

// 添加陣列隨機排序的方法
QuizApp.prototype.shuffleArray = function(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

QuizApp.prototype.renderHome = function() {
  return `
  <div class="container animate-fadeIn p-8">
    <!-- 移除原有的LOGO和冊次區塊，因為已經在固定頭部顯示了 -->
      
    <div class="space-y-5" style="width: 100%;">
      <!-- 刷題小高手 -->
      <button 
        onclick="app.navigateTo('topics')" 
        class="w-full group relative overflow-hidden bg-white rounded-3xl border border-pink-100 hover-shadow-lg hover-translate-y-1"
        style="width: 100%; position: relative; overflow: hidden; background-color: white; padding: 20px; border-radius: 24px; border: 1px solid rgba(255, 135, 176, 0.1); transition: all 0.3s ease; display: block; text-align: left; margin-bottom: 15px;"
      >
        <div style="position: absolute; inset: 0; background: linear-gradient(to right, rgba(255, 135, 176, 0.05), rgba(255, 179, 71, 0.05)); opacity: 0; transition: opacity 0.3s;"></div>
        <div style="position: relative;">
          <h3 style="font-size: 1.3rem; color: #333; margin-bottom: 6px; font-weight: 400; display: flex; align-items: center;">
            <span style="margin-right: 12px; flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(to right, #FF87B0, #FFB347); color: white;">
              📝
            </span>
            刷題小高手
          </h3>
          <p style="color: #666; padding-left: 48px; font-size: 0.9rem;">透過解題培養數學思維能力</p>
        </div>
      </button>
      
      <!-- 雲端教室 -->
      <a 
        href="https://sites.google.com/view/62001-111/%E9%A6%96%E9%A0%81?authuser=0" 
        target="_blank" 
        rel="noopener noreferrer" 
        class="w-full group relative overflow-hidden bg-white rounded-3xl border border-pink-100 hover-shadow-lg hover-translate-y-1"
        style="width: 100%; position: relative; overflow: hidden; background-color: white; padding: 20px; border-radius: 24px; border: 1px solid rgba(255, 135, 176, 0.1); transition: all 0.3s ease; display: block; text-align: left; text-decoration: none; color: inherit; margin-bottom: 15px;"
      >
        <div style="position: absolute; inset: 0; background: linear-gradient(to right, rgba(255, 135, 176, 0.05), rgba(255, 179, 71, 0.05)); opacity: 0; transition: opacity 0.3s;"></div>
        <div style="position: relative;">
          <h3 style="font-size: 1.3rem; color: #333; margin-bottom: 6px; font-weight: 400; display: flex; align-items: center;">
            <span style="margin-right: 12px; flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(to right, #FF87B0, #FFB347); color: white; opacity: 0.7;">
              📹
            </span>
            雲端教室
          </h3>
          <p style="color: #666; padding-left: 48px; font-size: 0.9rem;">觀看教科書影音解題掌握關鍵概念</p>
        </div>
      </a>

      <!-- 學測數學公式隨身讀 -->
      <a 
        href="https://sites.google.com/view/math-card-lt/%E9%A6%96%E9%A0%81" 
        target="_blank" 
        rel="noopener noreferrer" 
        class="w-full group relative overflow-hidden bg-white rounded-3xl border border-pink-100 hover-shadow-lg hover-translate-y-1"
        style="width: 100%; position: relative; overflow: hidden; background-color: white; padding: 20px; border-radius: 24px; border: 1px solid rgba(255, 135, 176, 0.1); transition: all 0.3s ease; display: block; text-align: left; text-decoration: none; color: inherit;"
      >
        <div style="position: absolute; inset: 0; background: linear-gradient(to right, rgba(255, 135, 176, 0.05), rgba(255, 179, 71, 0.05)); opacity: 0; transition: opacity 0.3s;"></div>
        <div style="position: relative;">
          <h3 style="font-size: 1.3rem; color: #333; margin-bottom: 6px; font-weight: 400; display: flex; align-items: center;">
            <span style="margin-right: 12px; flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(to right, #FF87B0, #FFB347); color: white; opacity: 0.7;">
              📚
            </span>
            學測數學公式隨身讀
          </h3>
          <p style="color: #666; padding-left: 48px; font-size: 0.9rem;">學測必備的數學公式一把罩</p>
        </div>
      </a>
    </div>
  </div>
  `;
};

QuizApp.prototype.renderTopics = function() {
  if (!this.data.quizData) return '<div class="text-center">載入中...</div>';

  const units = Object.keys(this.data.quizData.questions).sort((a, b) => {
    const aNum = parseInt(a.match(/\d+/)[0]);
    const bNum = parseInt(b.match(/\d+/)[0]);
    return aNum - bNum;
  });

  const topicsHtml = units.map((unit) => {
    const completedRounds = this.getCompletedRoundsCount(unit);
    const totalRounds = 3;
    const unitNumber = unit.match(/\d+/)[0];
    const unitTitle = unit.replace(/單元\d+\s/, '');

    return `
    <button
      onclick="app.selectTopic('${unit}')"
      class="btn topics-btn"
    >
      <div class="topic-content">
        <div class="flex items-center">
          <span class="unit-number">${unitNumber}</span>
          <span class="topic-name">${unitTitle}</span>
        </div>
        ${completedRounds > 0 ? `
          <span class="round-badge">${completedRounds}/${totalRounds} 回合</span>
        ` : ''}
      </div>
    </button>
    `;
  }).join('');

  return `
  <div class="container animate-fadeIn">
    <!-- 添加返回按鈕 -->
    <div class="back-button-container">
      <button onclick="app.navigateTo('home')" class="back-button">
        <span class="back-icon">←</span>
        <span>返回首頁</span>
      </button>
    </div>

    <div class="header-section">
      <div class="title-group">
        <h2 class="topic-title">數學1 單元選擇</h2>
        <p class="topic-description">選擇想要練習的數學主題開始學習</p>
      </div>
    </div>

    <div class="grid">
      ${topicsHtml}
    </div>
  </div>
  `;
};

QuizApp.prototype.renderQuiz = function() {
  if (this.data.quizComplete) {
    return this.renderQuizComplete();
  }

  const currentQuestions = this.getCurrentQuestions();

  if (!currentQuestions || currentQuestions.length === 0) {
    return '<div class="text-center">無法載入題目</div>';
  }

  // 在顯示當前問題前，先隨機排序當前問題的選項（如果是選擇題）
  const question = currentQuestions[this.data.currentQuestion];
  if (question.type === 'B' && question.options.length > 2 && !this.data.showFeedback) {
    // 只在未顯示反饋時進行隨機排序，避免在顯示正確/錯誤答案時改變順序
    question.options = this.shuffleArray([...question.options]);
  }

  const progress = ((this.data.currentQuestion + 1) / currentQuestions.length) * 100;

  return `
  <div class="container">
    <h2 class="quiz-title">${this.data.currentTopic} - 第 ${this.data.currentRound} 回合</h2>
    <div class="quiz-content-container">
      <!-- 進度條 -->
      <div class="progress-bar">
        <div class="progress-bar-fill" style="width: ${progress}%"></div>
      </div>

      <!-- 題目區域 -->
      <div class="question-container">
        ${this.renderQuestionContent(question)}
      </div>

      <!-- 解析區域 -->
      ${this.renderExplanation(question)}

      <!-- 下一題按鈕 -->
      ${this.renderNextButton()}
    </div>
  </div>
  `;
};

QuizApp.prototype.renderExplanation = function(question) {
  if (!this.data.showExplanation || !question.explanationImage) {
    return '';
  }

  return `
    <div class="explanation-container mt-4 animate-fadeIn">
      <h3 class="mb-2">解析：</h3>
      ${question.explanationImage.includes('http')
        ? `<div class="quiz-explanation-image"><img src="${question.explanationImage}" alt="解析" class="w-full"></div>`
        : `<p>${question.explanationImage}</p>`
      }
    </div>
  `;
};

QuizApp.prototype.getCurrentQuestions = function() {
  if (this.data.isReviewingWrongQuestions) {
    return this.data.wrongQuestions;
  }
  
  const questions = this.data.quizData?.questions?.[this.data.currentTopic]?.[this.data.currentRound];
  return questions || [];
};

QuizApp.prototype.renderQuestionContent = function(question) {
  let content = '';

  // 題目圖片或文字
  if (question.questionImage) {
    if (question.questionImage.includes('http')) {
      content += `<div class="quiz-question-image animate-fadeIn"><img src="${question.questionImage}" alt="題目" class="w-full mb-4"></div>`;
    } else {
      // 處理 LaTeX 內容
      let questionText = question.questionImage;
      // 如果文字是純 LaTeX 格式，直接使用
      if (questionText.startsWith('\\[') && questionText.endsWith('\\]')) {
        content += `<div class="math-content animate-fadeIn">${questionText}</div>`;
      } else {
        // 如果不是，可能需要額外處理
        content += `<div class="question-text animate-fadeIn">${questionText}</div>`;
      }
    }
  }

  // 選項處理也需要支援 LaTeX
  switch(question.type) {
    case 'A': // 是非題
      content += this.renderTrueFalseOptions(question);
      break;
    case 'B': // 選擇題
      content += this.renderMultipleChoiceOptions(question);
      break;
    case 'C': // 填充題
      content += this.renderFillInBlankInput(question);
      break;
    case 'D': // 配合題
      content += this.renderMatchingOptions(question);
      break;
  }

  // 顯示答對/答錯提示
  if (this.data.showFeedback) {
    content += `
      <div class="feedback-message ${this.data.isCorrect ? 'text-green-600' : 'text-red-600'} mt-2 text-center font-bold animate-fadeIn">
        ${this.data.isCorrect ? '答對了！' : '答錯了！'}
      </div>
    `;
  }

  // 渲染完成後觸發 MathJax 重新渲染
  setTimeout(() => {
    if (window.MathJax) {
      window.MathJax.typesetPromise && window.MathJax.typesetPromise();
    }
  }, 100);

  return content;
};

QuizApp.prototype.renderTrueFalseOptions = function(question) {
  return `
    <div class="options-grid">
      ${[
        { value: '1', text: 'O' },
        { value: '2', text: 'X' }
      ].map(option => `
        <button
          onclick="app.handleAnswerSubmission('${option.value}')"
          class="option ${this.getOptionClass(option.value)}"
          ${this.data.showFeedback ? 'disabled' : ''}
        >
          <span class="option-text">${option.text}</span>
        </button>
      `).join('')}
    </div>
  `;
};

QuizApp.prototype.renderMultipleChoiceOptions = function(question) {
    return `
        <div class="options-grid">
            ${question.options.map(option => {
                let optionContent = '';
                
                // 處理不同類型的選項內容
                if (option.image) {
                    // 圖片選項
                    optionContent = `<img src="${option.image}" alt="選項" class="option-image">`;
                } else if (option.text && (option.text.includes('\\[') || option.text.includes('$'))) {
                    // LaTeX 選項
                    optionContent = `<div class="math-content">${option.text}</div>`;
                } else {
                    // 純文字選項
                    optionContent = `<span class="option-text">${option.text}</span>`;
                }

                // 取得選項的類別
                const buttonClass = this.getOptionClass(option.value);
                const classes = ['option'];
                if (buttonClass) {
                    classes.push(buttonClass);
                }

                return `
                    <button
                        onclick="app.handleAnswerSubmission('${option.value}')"
                        class="${classes.join(' ')}"
                        ${this.data.showFeedback ? 'disabled' : ''}
                        data-option-type="${option.image ? 'image' : option.text.includes('\\[') || option.text.includes('$') ? 'latex' : 'text'}"
                    >
                        ${optionContent}
                    </button>
                `;
            }).join('')}
        </div>
    `;
};

QuizApp.prototype.renderFillInBlankInput = function(question) {
  return `
    <div class="fill-blank-container">
      <input 
        type="text" 
        class="fill-blank-input ${this.getOptionClass(this.data.selectedAnswer)}"
        onkeyup="if(event.key === 'Enter') app.handleAnswerSubmission(this.value)"
        ${this.data.showFeedback ? 'disabled' : ''}
      >
      <button 
        onclick="app.handleAnswerSubmission(document.querySelector('.fill-blank-input').value)"
        class="btn btn-primary"
        ${this.data.showFeedback ? 'disabled' : ''}
      >
        提交答案
      </button>
    </div>
  `;
};

QuizApp.prototype.renderMatchingOptions = function(question) {
  return `
    <div class="matching-container">
      <div class="matching-options">
        ${question.options.map(option => `
          <div class="matching-option" draggable="true">
            ${option.text}
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

QuizApp.prototype.getOptionClass = function(option) {
    if (!this.data.showFeedback) {
        return '';
    }

    const currentQuestion = this.getCurrentQuestions()[this.data.currentQuestion];
    let classes = [];

    // 錯題重練的情況
    if (this.data.isReviewingWrongQuestions) {
        if (option === this.data.selectedAnswer) {
            classes.push(this.data.isCorrect ? 'correct' : 'incorrect');
        }
        // 只在錯題重練時顯示正確答案
        if (!this.data.isCorrect && option === currentQuestion.correctAnswer) {
            classes.push('show-correct');
        }
    } else {
        // 一般作答時只顯示所選答案的對錯
        if (option === this.data.selectedAnswer) {
            classes.push(this.data.isCorrect ? 'correct' : 'incorrect');
        }
    }

    return classes.join(' ');
};

QuizApp.prototype.renderNextButton = function() {
  if (!this.data.showFeedback) {
    return '';
  }

  return `
    <button
      onclick="app.nextQuestion()"
      class="btn btn-primary w-full mt-4"
    >
      ${this.data.currentQuestion === this.getCurrentQuestions().length - 1 ? '完成' : '下一題'}
    </button>
  `;
};

QuizApp.prototype.handleAnswerSubmission = function(answer) {
  if (this.data.showFeedback) return;

  const currentQuestions = this.getCurrentQuestions();
  const question = currentQuestions[this.data.currentQuestion];
  
  this.data.selectedAnswer = answer;
  this.data.showFeedback = true;
  
  // 直接比對答案內容
  this.data.isCorrect = answer === question.correctAnswer;

  console.log('選擇的答案:', answer);
  console.log('正確答案:', question.correctAnswer);
  console.log('是否正確:', this.data.isCorrect);

  if (this.data.isCorrect) {
    this.data.correctAnswers++;
  } else {
    if (!this.data.isReviewingWrongQuestions) {
      this.data.wrongQuestions.push(question);
    }
    this.data.showExplanation = this.data.isReviewingWrongQuestions;
  }

  this.render();
};

QuizApp.prototype.nextQuestion = function() {
  const currentQuestions = this.getCurrentQuestions();
  
  if (this.data.currentQuestion < currentQuestions.length - 1) {
    this.data.currentQuestion++;
    this.data.selectedAnswer = null;
    this.data.showFeedback = false;
    this.data.showExplanation = false;
    
    // 提前隨機排序下一題的選項（如果是選擇題）
    const nextQuestion = currentQuestions[this.data.currentQuestion];
    if (nextQuestion && nextQuestion.type === 'B' && nextQuestion.options.length > 2) {
      nextQuestion.options = this.shuffleArray([...nextQuestion.options]);
    }
  } else {
    this.data.quizComplete = true;
  }
  this.render();
};

// 確保 startNewRound 函數在開始新回合時也會隨機排序所有題目的選項
QuizApp.prototype.startNewRound = function(round) {
  this.data.currentPage = 'quiz';
  this.data.currentRound = round;
  this.data.currentQuestion = 0;
  this.data.correctAnswers = 0;
  this.data.wrongQuestions = [];
  this.data.quizComplete = false;
  this.data.selectedAnswer = null;
  this.data.showFeedback = false;
  this.data.showExplanation = false;
  this.data.isReviewingWrongQuestions = false;
  
  // 隨機排序這一回合所有題目的選項
  this.randomizeAllOptions();
  
  this.render();
};



QuizApp.prototype.getCompletedRounds = function(unit) {
  // 從 localStorage 讀取完成記錄
  const completedKey = `completed_${unit}`;
  const completed = localStorage.getItem(completedKey);
  return completed ? parseInt(completed) : 0;
};

// 更新完成回合記錄的方法
QuizApp.prototype.renderQuizComplete = function() {
  const totalQuestions = this.getCurrentQuestions().length;
  const correctAnswers = this.data.correctAnswers;
  const accuracy = (correctAnswers / totalQuestions) * 100;
  const showNextRound = this.data.currentRound < 3;
  const mustRetry = !this.data.isReviewingWrongQuestions && accuracy < 100;

  // 修改完成回合的判斷邏輯
  if (accuracy === 100 && !this.data.isReviewingWrongQuestions) {
    // 當第一次作答就100%正確時，直接更新完成回合
    this.updateCompletedRounds(this.data.currentTopic, this.data.currentRound);
  } else if (this.data.isReviewingWrongQuestions) {
    // 完成錯題練習後，也要更新完成回合
    this.updateCompletedRounds(this.data.currentTopic, this.data.currentRound);
  }

  // 根據正確率決定顯示的消息
  let feedbackMessage = "";
  if (accuracy >= 80) {
    feedbackMessage = "太棒了！";
  } else if (accuracy >= 60) {
    feedbackMessage = "做得很好！";
  } else if (accuracy >= 40) {
    feedbackMessage = "繼續加油！";
  } else {
    feedbackMessage = "別灰心，再試一次！";
  }

  return `
  <div class="container text-center animate-fadeIn">
    <div style="margin-bottom: 20px; color: #333; font-weight: 500; font-size: 1.25rem;">
      ${this.data.isReviewingWrongQuestions
        ? "您已完成錯題練習！"
        : `您已完成第 ${this.data.currentRound} 回合的題目。`}
    </div>

    <div class="completion-content" style="background: linear-gradient(135deg, #ffecf2, #fff5ec); padding: 25px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
      <!-- 愛心圖示 -->
      <div style="margin-bottom: 15px; color: #FF87B0; font-size: 2rem;">
        ❤️
      </div>
      
      <!-- 圓形進度條 -->
      <div style="position: relative; width: 120px; height: 120px; margin: 0 auto 15px auto;">
        <svg width="120" height="120" viewBox="0 0 120 120" style="transform: rotate(-90deg);">
          <!-- 背景圓 -->
          <circle r="50" cx="60" cy="60" fill="transparent" stroke="#e6e6e6" stroke-width="12"></circle>
          <!-- 進度圓 -->
          <circle r="50" cx="60" cy="60" fill="transparent" stroke="#FF87B0" stroke-width="12" 
            stroke-dasharray="314.16" stroke-dashoffset="${314.16 - (accuracy / 100) * 314.16}"
            style="transition: stroke-dashoffset 0.5s ease;"></circle>
        </svg>
        <!-- 中間的百分比文字 -->
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; font-weight: bold; color: #333;">
          ${Math.round(accuracy)}%
        </div>
      </div>
      
      <!-- 反饋信息 -->
      <div style="font-size: 1.25rem; font-weight: 500; margin-bottom: 15px; color: #333;">
        ${feedbackMessage}
      </div>
      
      <!-- 詳細統計 -->
      <div style="font-size: 1rem; color: #666; margin-bottom: 20px;">
        您在這回合中答對了 ${correctAnswers} 題，答對率為 ${accuracy.toFixed(1)}%
      </div>

      <!-- 按鈕部分 -->
      <div class="grid gap-4">
        ${mustRetry ? `
          <button onclick="app.handleQuizComplete('retry')" class="btn" 
            style="background: linear-gradient(135deg, #FF87B0, #FFB347); color: white; font-weight: 500; padding: 12px; border-radius: 50px; width: 100%; border: none; font-size: 1rem; box-shadow: 0 4px 10px rgba(255, 135, 176, 0.3);">
            錯題重練
          </button>
        ` : `
          ${showNextRound ? `
            <button onclick="app.handleQuizComplete('nextRound')" class="btn" 
              style="background: linear-gradient(135deg, #FF87B0, #FFB347); color: white; font-weight: 500; padding: 12px; border-radius: 50px; width: 100%; border: none; font-size: 1rem; box-shadow: 0 4px 10px rgba(255, 135, 176, 0.3);">
              進入下一回合
            </button>
          ` : ''}
          <button onclick="app.handleQuizComplete('topics')" class="btn" 
            style="background: linear-gradient(135deg, #FFB347, #FF87B0); color: white; font-weight: 500; padding: 12px; border-radius: 50px; width: 100%; border: none; font-size: 1rem; box-shadow: 0 4px 10px rgba(255, 179, 71, 0.3);">
            回到單元選擇
          </button>
        `}
      </div>
    </div>
  </div>
  `;
};

QuizApp.prototype.handleQuizComplete = function(option) {
  switch(option) {
    case 'retry':
      if (this.data.wrongQuestions.length > 0) {
        this.data.isReviewingWrongQuestions = true;
        this.data.currentQuestion = 0;
        this.data.correctAnswers = 0;
        this.data.selectedAnswer = null;
        this.data.showFeedback = false;
        this.data.showExplanation = false;
        this.data.quizComplete = false;
        
        // 對於選擇題的錯題進行選項重新排序
        this.data.wrongQuestions = this.data.wrongQuestions.map(question => {
          if (question.type === 'B' && question.options.length > 2) {
            // 複製選項陣列以避免修改原始資料
            const shuffledOptions = [...question.options];
            
            // 隨機打亂選項順序
            for (let i = shuffledOptions.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
            }
            
            return {
              ...question,
              options: shuffledOptions
            };
          }
          return question;
        });
      }
      break;
      
    case 'nextRound':
      if (this.data.currentRound < 3) {
        // 如果是從錯題練習完畢後進入下一回合，標記當前回合為已完成
        if (this.data.isReviewingWrongQuestions) {
          this.updateCompletedRounds(this.data.currentTopic, this.data.currentRound);
        }
        
        this.data.currentRound++;
        this.data.currentQuestion = 0;
        this.data.correctAnswers = 0;
        this.data.wrongQuestions = [];
        this.data.selectedAnswer = null;
        this.data.showFeedback = false;
        this.data.showExplanation = false;
        this.data.quizComplete = false;
        this.data.isReviewingWrongQuestions = false;
        
        this.randomizeAllOptions();
      }
      break;
      
    case 'topics':
      this.navigateTo('topics');
      break;
      
    case 'home':
      this.data.fromQuiz = true; // 添加標記，表示從測驗頁面返回
      this.navigateTo('home');
      break;
  }
  
  this.render();
};

QuizApp.prototype.updateCompletedRounds = function(unit, round) {
  // 如果沒有該單元的記錄，先初始化
  if (!this.data.completedRounds[unit]) {
    this.data.completedRounds[unit] = 0;
  }

  // 直接使用當前回合數更新記錄
  if (round > this.data.completedRounds[unit]) {
    this.data.completedRounds[unit] = round;
    console.log(`更新${unit}的完成回合數為: ${round}`);
  }
};

QuizApp.prototype.getCompletedRoundsCount = function(unit) {
  // 確保返回正確的完成回合數
  return this.data.completedRounds[unit] || 0;
};

QuizApp.prototype.renderFooter = function() {
  return `
  <footer class="bg-white border-t border-zinc-100 py-4 mt-auto">
    <div class="max-w-3xl mx-auto px-4 text-center">
      <p class="text-zinc-600 text-sm mb-1">Longteng Education Co., Ltd. All rights reserved</p>
      <p class="text-zinc-500 text-sm">版權所有龍騰文化事業股份有限公司</p>
    </div>
  </footer>
  `;
};

QuizApp.prototype.render = function() {
  const appElement = document.getElementById('app');
  if (!appElement) {
    console.error('找不到 app 元素');
    return;
  }

  let content = '';
  switch (this.data.currentPage) {
    case 'home':
      content = this.renderHome();
      break;
    case 'topics':
      content = this.renderTopics();
      break;
    case 'roundSelection':
      content = this.renderRoundSelection();
      break;
    case 'quiz':
      content = this.renderQuiz();
      break;
    default:
      content = this.renderHome();
  }

  const footerHtml = this.renderFooter();
  
  // 在所有頁面都顯示固定置頂的LOGO和冊次（包括首頁）
  const fixedHeaderHtml = this.renderFixedHeader();

  appElement.innerHTML = `
    ${fixedHeaderHtml}
    ${content}
    ${footerHtml}
  `;

  // 在渲染完成後觸發 MathJax 重新渲染
  setTimeout(() => {
    if (window.MathJax) {
      window.MathJax.typesetPromise && window.MathJax.typesetPromise();
    }
  }, 100);
};

window.onload = function() {
  console.log('開始初始化應用程式...');
  window.app = new QuizApp();
};
