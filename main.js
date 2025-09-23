    const MODELS_API = `/api/models`;
    
    let app, model;
    let modelsList = [];
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let eyeTrackingEnabled = true;



    // 初始化PIXI应用
    function initPixiApp() {
        const canvas = document.getElementById('live2d');
        app = new PIXI.Application({
            view: canvas,
            transparent: true,
            autoDensity: true,
            width: 400,
            height: 600
        });
        
        // 自动调整canvas大小
        const resizeObserver = new ResizeObserver(() => {
            const container = document.getElementById('live2dContainer');
            app.renderer.resize(container.clientWidth, container.clientHeight - 30);
        });
        resizeObserver.observe(document.getElementById('live2dContainer'));
    }

    // 获取模型列表
    async function loadModelsList() {
        try {
            setStatus('loading');
            const response = await fetch('./models.json');
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

            //const fullModelPath = `${API_BASE}${modelPath}`;
            const fullModelPath = `./models${modelPath}`;
            console.log('加载模型:', fullModelPath);

            const loadedModel = await PIXI.live2d.Live2DModel.from(fullModelPath, {autoInteract: false});
            model = loadedModel;
            app.stage.addChild(model);

            // 设置模型位置和缩放
            model.scale.set(0.15);
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

    // 鼠标移动处理
    function handleMouseMove(e) {
        if (model && eyeTrackingEnabled) {
            const container = document.getElementById('live2dContainer');
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top - 30; // 减去拖拽栏高度
            //  model.focus(x, y);
        }
    }

    // 应用窗口设置
    function applyWindowSettings() {
        const container = document.getElementById('live2dContainer');
        const posX = document.getElementById('posX').value;
        const posY = document.getElementById('posY').value;
        const width = document.getElementById('width').value;
        const height = document.getElementById('height').value;

        container.style.left = `${posX}px`;
        container.style.top = `${posY}px`;
        container.style.width = `${width}px`;
        container.style.height = `${height}px`;

        // 重新定位模型到中心
        if (model) {
            setTimeout(() => {
                model.x = app.screen.width / 2;
                model.y = app.screen.height / 2;
            }, 100);
        }
    }

    // 重置窗口设置
    function resetWindowSettings() {
        document.getElementById('posX').value = 722;
        document.getElementById('posY').value = 37;
        document.getElementById('width').value = 1000;
        document.getElementById('height').value = 1000;
        applyWindowSettings();
    }

    // 拖拽功能
    function initDragging() {
        const dragHandle = document.getElementById('dragHandle');
        const container = document.getElementById('live2dContainer');

        dragHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = container.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            dragHandle.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                
                container.style.left = `${newX}px`;
                container.style.top = `${newY}px`;
                
                // 更新输入框的值
                document.getElementById('posX').value = newX;
                document.getElementById('posY').value = newY;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                dragHandle.style.cursor = 'move';
            }
        });
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
                <div style="margin-top: 10px; font-size: 12px; color: #666;">请检查网络连接或服务器状态</div>
            </div>
        `;
        loadingIndicator.style.display = 'block';
        setTimeout(() => {
            loadingIndicator.style.display = 'none';
            loadingIndicator.innerHTML = `
                <div style="text-align: center;">
                    <div>加载中...</div>
                    <div style="margin-top: 10px; font-size: 12px; color: #666;">请稍候</div>
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

    document.getElementById('eyeTracking').addEventListener('change', (e) => {
        eyeTrackingEnabled = e.target.checked;
    });

    // 鼠标移动监听
    document.addEventListener('mousemove', handleMouseMove);

    // 输入框变化监听
    ['posX', 'posY', 'width', 'height'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            // 实时更新（可选）
            // applyWindowSettings();
        });
    });

    // 初始化
    window.addEventListener('load', () => {
        initPixiApp();
        initDragging();
        applyWindowSettings();
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
    });
