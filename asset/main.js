

    let app, model;
    let modelsList = [];
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let controlsPanelOpen = false;
    let currentScale = 0.15;

    // 移动端控制面板切换
    function toggleControlsPanel() {
        const controls = document.getElementById('controls');
        const overlay = document.getElementById('controlsOverlay');
        const toggle = document.getElementById('controlsToggle');
        
        controlsPanelOpen = !controlsPanelOpen;
        
        if (controlsPanelOpen) {
            controls.classList.add('active');
            overlay.classList.add('active');
            toggle.innerHTML = '✕';
        } else {
            controls.classList.remove('active');
            overlay.classList.remove('active');
            toggle.innerHTML = '⚙️';
        }
    }

    // 检测设备类型
    function isMobileDevice() {
        return window.innerWidth <= 767 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // 初始化PIXI应用
    function initPixiApp() {
        const canvas = document.getElementById('live2d');
        app = new PIXI.Application({
            view: canvas,
            transparent: true,
            autoDensity: true,
            width: 400,
            height: 500
        });
        
        // 自动调整canvas大小
        const resizeObserver = new ResizeObserver(() => {
            const container = document.getElementById('live2dContainer');
            const rect = container.getBoundingClientRect();
            app.renderer.resize(rect.width, rect.height - 30);
        });
        resizeObserver.observe(document.getElementById('live2dContainer'));
    }

    // 获取模型列表
    async function loadModelsList() {
        try {
            setStatus('loading');
            const response = await fetch('./asset/models.json');
            const result = await response.json();
            if (result.code === 1 && result.data) {
                modelsList = result.data;
                populateModelSelect();
                setStatus('success');
            } else {
                console.error('获取模型列表失败:', result);
                showError('获取模型列表失败');
                setStatus('error');
            }
        } catch (error) {
            console.error('请求模型列表失败:', error);
            showError('请求模型列表失败，请检查服务器连接');
            setStatus('error');
        }
    }

    // 设置状态指示器
    function setStatus(status) {
        const indicator = document.getElementById('statusIndicator');
        indicator.className = `status-indicator ${status}`;
    }

    // 填充模型选择下拉框
    function populateModelSelect() {
        const select = document.getElementById('modelSelect');
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        modelsList.forEach(modelData => {
            const option = document.createElement('option');
            option.value = modelData.modelPath;
            option.textContent = modelData.name;
            select.appendChild(option);
        });
    }

    // 加载指定模型
    async function loadModel(modelPath) {
        showLoading(true);
        setStatus('loading');
        clearMotionButtons();
        
        try {
            if (model) {
                app.stage.removeChild(model);
                model.destroy();
                model = null;
            }

            const fullModelPath = `./models${modelPath}`;
            console.log('加载模型:', fullModelPath);

            const loadedModel = await PIXI.live2d.Live2DModel.from(fullModelPath, {autoInteract: false});
            model = loadedModel;
            app.stage.addChild(model);

            // 设置模型位置和缩放
            model.scale.set(currentScale);
            model.x = app.screen.width / 2;
            model.y = app.screen.height / 2;
            model.anchor.set(0.5, 0.5);

            createMotionButtons();
            showLoading(false);
            setStatus('success');
            console.log('模型加载成功');
        } catch (error) {
            console.error('加载模型失败:', error);
            showError(`加载模型失败: ${error.message}`);
            showLoading(false);
            setStatus('error');
        }
    }

    // 创建动作按钮
    function createMotionButtons() {
        const buttonsContainer = document.getElementById('motionButtons');
        const settings = model.internalModel.settings;
        
        if (settings.motions) {
            Object.keys(settings.motions).forEach(group => {
                if (settings.motions[group]) {
                    settings.motions[group].forEach((motion, i) => {
                        const btn = document.createElement('button');
                        btn.textContent = `${group} ${i + 1}`;
                        btn.onclick = () => {
                            console.log(`播放动作: ${group} ${i}`);
                            model.motion(group, i, 3);
                        };
                        buttonsContainer.appendChild(btn);
                    });
                }
            });
        }
    }

    // 清空动作按钮
    function clearMotionButtons() {
        document.getElementById('motionButtons').innerHTML = '';
    }

    // 更新模型缩放
    function updateModelScale(scale) {
        currentScale = parseFloat(scale);
        document.getElementById('scaleValue').textContent = currentScale.toFixed(1);
        
        if (model) {
            model.scale.set(currentScale);
        }
    }

    // 鼠标/触摸移动处理
    function handlePointerMove(e) {
        // 移除眼球追踪功能
    }

    // 应用窗口设置
    function applyWindowSettings() {
        const container = document.getElementById('live2dContainer');
        const posX = document.getElementById('posX').value;
        const posY = document.getElementById('posY').value;
        const width = document.getElementById('width').value;
        const height = document.getElementById('height').value;

        if (!isMobileDevice()) {
            container.style.left = `${posX}px`;
            container.style.top = `${posY}px`;
            container.style.width = `${width}px`;
            container.style.height = `${height}px`;
        }

        // 重新定位模型到中心
        if (model) {
            setTimeout(() => {
                model.x = app.screen.width / 2;
                model.y = app.screen.height / 2;
            }, 100);
        }

        // 移动端自动关闭面板
        if (isMobileDevice() && controlsPanelOpen) {
            toggleControlsPanel();
        }
    }

    // 重置窗口设置
    function resetWindowSettings() {
        if (isMobileDevice()) {
            document.getElementById('posX').value = 10;
            document.getElementById('posY').value = 10;
            document.getElementById('width').value = window.innerWidth - 20;
            document.getElementById('height').value = window.innerHeight - 20;
        } else {
            document.getElementById('posX').value = 500;
            document.getElementById('posY').value = 50;
            document.getElementById('width').value = 1400;
            document.getElementById('height').value = 900;
        }
        applyWindowSettings();
    }

    // 拖拽功能（支持触摸）
    function initDragging() {
        const dragHandle = document.getElementById('dragHandle');
        const container = document.getElementById('live2dContainer');

        // 鼠标事件
        dragHandle.addEventListener('mousedown', startDrag);
        // 触摸事件
        dragHandle.addEventListener('touchstart', startDrag, { passive: false });

        function startDrag(e) {
            e.preventDefault();
            isDragging = true;
            const rect = container.getBoundingClientRect();
            
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            
            dragOffset.x = clientX - rect.left;
            dragOffset.y = clientY - rect.top;
            dragHandle.style.cursor = 'grabbing';
        }

        // 鼠标移动
        document.addEventListener('mousemove', handleDragMove);
        // 触摸移动
        document.addEventListener('touchmove', handleDragMove, { passive: false });

        function handleDragMove(e) {
            if (isDragging && !isMobileDevice()) {
                e.preventDefault();
                const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                const clientY = e.clientY || (e.touches && e.touches[0].clientY);
                
                const newX = clientX - dragOffset.x;
                const newY = clientY - dragOffset.y;
                
                container.style.left = `${Math.max(0, newX)}px`;
                container.style.top = `${Math.max(0, newY)}px`;
                
                // 更新输入框的值
                document.getElementById('posX').value = Math.max(0, newX);
                document.getElementById('posY').value = Math.max(0, newY);
            }
        }

        // 结束拖拽
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);

        function endDrag() {
            if (isDragging) {
                isDragging = false;
                dragHandle.style.cursor = 'move';
            }
        }
    }

    // 显示/隐藏加载指示器
    function showLoading(show) {
        document.getElementById('loadingIndicator').style.display = show ? 'block' : 'none';
    }

    // 显示错误信息
    function showError(message) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        loadingIndicator.innerHTML = `
            <div style="text-align: center; color: #dc3545;">
                <div>❌ ${message}</div>
                <div style="margin-top: 10px; font-size: 14px; color: #666;">请检查网络连接或服务器状态</div>
            </div>
        `;
        loadingIndicator.style.display = 'block';
        setTimeout(() => {
            loadingIndicator.style.display = 'none';
            loadingIndicator.innerHTML = `
                <div style="text-align: center;">
                    <div>加载中...</div>
                    <div style="margin-top: 10px; font-size: 14px; color: #666;">请稍候</div>
                </div>
            `;
        }, 3000);
    }

    // 事件监听器
    document.getElementById('modelSelect').addEventListener('change', (e) => {
        const selectedModelPath = e.target.value;
        if (selectedModelPath) {
            loadModel(selectedModelPath);
        }
    });

    document.getElementById('modelScale').addEventListener('input', (e) => {
        updateModelScale(e.target.value);
    });

    // 控制面板切换
    document.getElementById('controlsToggle').addEventListener('click', toggleControlsPanel);
    document.getElementById('controlsOverlay').addEventListener('click', toggleControlsPanel);

    // 输入框变化监听
    ['posX', 'posY', 'width', 'height'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {

        });
    });

    // 初始化
    window.addEventListener('load', () => {
        initPixiApp();
        initDragging();
        
        // 移动端自动调整
        if (isMobileDevice()) {
            resetWindowSettings();
        } else {
            applyWindowSettings();
        }
        
        showLoading(false);
        loadModelsList();
    });

    // 窗口调整时重新定位模型
    window.addEventListener('resize', () => {
        if (model) {
            setTimeout(() => {
                model.x = app.screen.width / 2;
                model.y = app.screen.height / 2;
            }, 100);
        }
        
        // 移动端自动调整尺寸
        if (isMobileDevice()) {
            const container = document.getElementById('live2dContainer');
            container.style.left = '10px';
            container.style.top = '10px';
            container.style.right = '10px';
            container.style.bottom = '10px';
            container.style.width = 'auto';
            container.style.height = 'auto';
        }
    });

    // 防止移动端页面缩放
    document.addEventListener('touchstart', function(event) {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    });

    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
