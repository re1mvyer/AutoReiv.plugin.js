/**
 * @name AutoReiv
 * @author re1mayer
 * @authorId 355307086667841537
 * @description Ваш приветствует АвтоРейв и он поможет выполнить любое задание Discord. Check link!
 * @website https://steamcommunity.com/id/re1mvyer/
 * @source https://gist.github.com/re1mvyer/1f2a1eaf35aa4675fa5c5f44497ac4f7
 * @donate https://www.donationalerts.com/r/re1mayer
 * @invite https://discord.gg/8aNprKRmsC
 */

module.exports = class AutoReiv {
    constructor() {
        this.button = null;
        this.modal = null;
        this.activeTasks = new Map();
        this.hotkeyHandler = null;
        this._trafficMetadataSealed = null;
    }

    getName() { return "AutoReiv"; }
    getDescription() { return "Ваш приветствует АвтоРейв и он поможет выполнить любое задание Discord. Check link!"; }
    getVersion() { return "1.0.0"; }
    getAuthor() { return "re1mayer"; }

    start() {
        this.injectStyles();
        this.initModules();
        this.createButton();
        this.registerHotkey();
    }

    stop() {
        this.removeStyles();
        if (this.button) this.button.remove();
        if (this.modal) this.modal.remove();
        if (this.hotkeyHandler) {
            document.removeEventListener('keydown', this.hotkeyHandler);
            this.hotkeyHandler = null;
        }
        this.restoreModules();
    }

    // ========== СТИЛИ ==========
    injectStyles() {
        const css = `
            #qa-floating-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 56px;
                height: 56px;
                background: rgba(0, 0, 0, 0.55);
                backdrop-filter: blur(8px);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                z-index: 10000;
                font-size: 28px;
                color: white;
                transition: background 0.2s, transform 0.2s;
                user-select: none;
            }
            #qa-floating-btn:hover {
                background: rgba(0, 0, 0, 0.8);
                transform: scale(1.08);
            }
            #qa-modal-backdrop {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5);
                backdrop-filter: blur(4px);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #qa-modal {
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                padding: 24px;
                width: 480px;
                max-width: 95vw;
                max-height: 85vh;
                overflow-y: auto;
                color: #dcddde;
                box-shadow: 0 8px 32px rgba(0,0,0,0.6);
                border: 1px solid rgba(255,255,255,0.1);
                scrollbar-width: thin;
                scrollbar-color: rgba(255,255,255,0.2) transparent;
            }
            #qa-modal::-webkit-scrollbar {
                width: 6px;
            }
            #qa-modal::-webkit-scrollbar-track {
                background: transparent;
                border-radius: 3px;
            }
            #qa-modal::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.2);
                border-radius: 3px;
            }
            #qa-modal::-webkit-scrollbar-thumb:hover {
                background: rgba(255,255,255,0.35);
            }

            .qa-btn {
                margin: 4px;
                padding: 8px 16px;
                border: none;
                border-radius: 20px;
                color: white;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.2s ease;
                pointer-events: auto;
                background: rgba(255,255,255,0.1);
                backdrop-filter: blur(4px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                border: 1px solid rgba(255,255,255,0.15);
                letter-spacing: 0.3px;
            }
            .qa-btn:hover {
                background: rgba(255,255,255,0.2);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                border-color: rgba(255,255,255,0.3);
            }
            .qa-btn:active {
                transform: scale(0.96);
                box-shadow: 0 1px 4px rgba(0,0,0,0.2);
            }
            .qa-btn[disabled] {
                opacity: 0.4;
                cursor: not-allowed;
                pointer-events: none;
                transform: none;
                box-shadow: none;
            }
            .qa-custom-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(8px);
                color: #fff;
                padding: 14px 24px;
                border-radius: 10px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.6);
                z-index: 10002;
                font-size: 14px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 10px;
                opacity: 0;
                transform: translateX(20px);
                transition: opacity 0.3s, transform 0.3s;
                pointer-events: none;
                max-width: 400px;
            }
            .qa-custom-notification.show {
                opacity: 1;
                transform: translateX(0);
                pointer-events: auto;
            }
            .qa-custom-notification .close-btn {
                margin-left: auto;
                background: none;
                border: none;
                color: #b9bbbe;
                cursor: pointer;
                font-size: 18px;
                line-height: 1;
            }
        `;
        this.styleTag = document.createElement('style');
        this.styleTag.textContent = css;
        document.head.appendChild(this.styleTag);
    }

    removeStyles() {
        if (this.styleTag) this.styleTag.remove();
    }

    // ========== МОДУЛИ ==========
    initModules() {
        const wp = BdApi.Webpack;
        const byProps = (...props) => wp.getModule(m => props.every(p => typeof m[p] !== 'undefined'), { searchExports: true });

        this.QuestsStore = byProps('quests', 'getQuest') || byProps('quests');
        this.Dispatcher = byProps('subscribe', 'dispatch');

        let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
        webpackChunkdiscord_app.pop();
        this.api = Object.values(wpRequire.c).find(x => x?.exports?.Bo?.get)?.exports?.Bo;
        if (!this.api) {
            this.api = byProps('get', 'post', 'put');
        }

        this.RunningGameStore = byProps('getRunningGames', 'getGameForPID');
        this.ApplicationStreamingStore = byProps('getStreamerActiveStreamMetadata');
        this.ChannelStore = byProps('getSortedPrivateChannels');
        this.GuildChannelStore = byProps('getAllGuilds');
        this.isApp = typeof DiscordNative !== 'undefined';

        if (this.RunningGameStore) {
            this.origGetRunning = this.RunningGameStore.getRunningGames.bind(this.RunningGameStore);
            this.origGetGameForPID = this.RunningGameStore.getGameForPID.bind(this.RunningGameStore);
        }
        if (this.ApplicationStreamingStore) {
            this.origGetStreamMetadata = this.ApplicationStreamingStore.getStreamerActiveStreamMetadata.bind(this.ApplicationStreamingStore);
        }
    }

    restoreModules() {
        if (this.RunningGameStore) {
            this.RunningGameStore.getRunningGames = this.origGetRunning;
            this.RunningGameStore.getGameForPID = this.origGetGameForPID;
        }
        if (this.ApplicationStreamingStore) {
            this.ApplicationStreamingStore.getStreamerActiveStreamMetadata = this.origGetStreamMetadata;
        }
    }

    // ========== КНОПКА ==========
    createButton() {
        const btn = document.createElement('div');
        btn.id = 'qa-floating-btn';
        btn.innerHTML = '🤖';
        btn.title = 'AutoReiv (Ctrl+Shift+Q)';
        btn.addEventListener('click', () => this.toggleModal());
        document.body.appendChild(btn);
        this.button = btn;
    }

    // ========== МОДАЛ ==========
    toggleModal() {
        if (this.modal) this.closeModal();
        else this.openModal();
    }

    openModal() {
        if (document.getElementById('qa-modal-backdrop')) return;

        const backdrop = document.createElement('div');
        backdrop.id = 'qa-modal-backdrop';
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) this.closeModal();
        });

        const modal = document.createElement('div');
        modal.id = 'qa-modal';
        modal.innerHTML = `<h2 style="margin-top:0; color: #fff;">🤖 AutoReiv</h2>`;
        modal.appendChild(this.buildGlobalButtons());
        modal.appendChild(this.buildQuestList());

        modal.addEventListener('click', (e) => {
            const btn = e.target.closest('.qa-btn');
            if (!btn || btn.disabled) return;
            e.stopPropagation();
            const action = btn.dataset.action;
            const questId = btn.dataset.questId;
            if (action) {
                this.handleAction(action, questId);
            }
        });

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);
        this.modal = backdrop;
        this.updateQuestList();
    }

    closeModal() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }

    buildGlobalButtons() {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-wrap:wrap;margin-bottom:16px;';
        const btns = [
            ['🎯 Принять все', 'enrollAll', '#5865f2'],
            ['▶️ Выполнить все', 'completeAll', '#5865f2'],
            ['🎁 Забрать все', 'claimAll', '#43b581'],
            ['🔍 Проверить', 'checkQuests', '#faa61a'],
            ['⏹️ Стоп', 'stopAll', '#f04747']
        ];
        btns.forEach(([text, action, color]) => {
            const btn = this._makeButton(text, color, action);
            if (action === 'stopAll') this._stopBtn = btn;
            row.appendChild(btn);
        });
        return row;
    }

    buildQuestList() {
        const list = document.createElement('div');
        list.id = 'qa-quest-list';
        return list;
    }

    updateQuestList() {
        const container = document.getElementById('qa-quest-list');
        if (!container) return;
        const quests = this.getAvailableQuests();
        container.innerHTML = '';
        if (quests.length === 0) {
            container.innerHTML = '<div style="color:#999;">Нет активных квестов</div>';
        }
        quests.forEach(quest => {
            const card = document.createElement('div');
            card.style.cssText = 'background: rgba(255,255,255,0.05); border-radius:8px; padding:14px; margin-bottom:10px; backdrop-filter: blur(4px);';
            const name = quest.config.messages.questName;
            const cfg = quest.config.taskConfig ?? quest.config.taskConfigV2;
            const type = Object.keys(cfg.tasks)[0];
            const target = cfg.tasks[type].target;
            const current = quest.userStatus?.progress?.[type]?.value ?? 0;
            const pct = Math.min(100, Math.floor((current / target) * 100));

            card.innerHTML = `
                <div style="font-weight:bold; margin-bottom:8px; color: #fff;">${name}</div>
                <div style="background: rgba(255,255,255,0.1); height:8px; border-radius:4px; margin-bottom:8px;">
                    <div style="background: #43b581; width:${pct}%; height:100%; border-radius:4px;"></div>
                </div>
                <div style="font-size:12px; margin-bottom:10px; color: #b9bbbe;">${current}/${target} (${pct}%)</div>
            `;

            const row = document.createElement('div');
            row.style.cssText = 'display:flex; gap:8px;';

            const canEnroll = !quest.userStatus?.enrolledAt && !quest.userStatus?.completedAt;
            const canComplete = quest.userStatus?.enrolledAt && !quest.userStatus?.completedAt;
            const canClaim = quest.userStatus?.completedAt && !quest.userStatus?.claimedAt;

            row.appendChild(this._makeButton('Принять', canEnroll ? '#5865f2' : '#4f545c', 'enrollQuest', quest.id, !canEnroll));
            row.appendChild(this._makeButton('Выполнить', canComplete ? '#5865f2' : '#4f545c', 'completeQuest', quest.id, !canComplete));
            row.appendChild(this._makeButton('Забрать', canClaim ? '#43b581' : '#4f545c', 'claimQuest', quest.id, !canClaim));
            card.appendChild(row);
            container.appendChild(card);
        });

        if (this._stopBtn) {
            this._stopBtn.disabled = this.activeTasks.size === 0;
        }
    }

    _makeButton(text, bgColor, action, questId = null, disabled = false) {
        const btn = document.createElement('button');
        btn.className = 'qa-btn';
        btn.textContent = text;
        btn.style.background = bgColor;
        btn.disabled = disabled;
        btn.dataset.action = action;
        if (questId) btn.dataset.questId = questId;
        return btn;
    }

    handleAction(action, questId) {
        switch (action) {
            case 'enrollAll': this.enrollAll(); break;
            case 'completeAll': this.completeAll(); break;
            case 'claimAll': this.claimAll(); break;
            case 'checkQuests': this.checkQuests(); break;
            case 'stopAll': this.stopAll(); break;
            case 'enrollQuest': this.enrollQuest(questId); break;
            case 'completeQuest': this.completeQuestById(questId); break;
            case 'claimQuest': this.claimQuestWrapper(questId); break;
        }
    }

    completeQuestById(questId) {
        const quest = this.getAvailableQuests().find(q => q.id === questId);
        if (quest) this.completeQuest(quest);
    }

    registerHotkey() {
        this.hotkeyHandler = (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
                e.preventDefault();
                this.toggleModal();
            }
        };
        document.addEventListener('keydown', this.hotkeyHandler);
    }

    showNotification(message, duration = 4000) {
        const existing = document.querySelector('.qa-custom-notification');
        if (existing) existing.remove();

        const notif = document.createElement('div');
        notif.className = 'qa-custom-notification';
        notif.innerHTML = `<span>${message}</span><button class="close-btn">✕</button>`;
        notif.querySelector('.close-btn').addEventListener('click', () => notif.remove());
        document.body.appendChild(notif);
        requestAnimationFrame(() => notif.classList.add('show'));
        setTimeout(() => {
            if (notif.parentNode) {
                notif.classList.remove('show');
                setTimeout(() => notif.remove(), 300);
            }
        }, duration);
    }

    // ========== МЕТОДЫ ==========
    getAvailableQuests() {
        if (!this.QuestsStore?.quests) return [];
        return [...this.QuestsStore.quests.values()].filter(q => {
            if (!q.config) return false;
            if (new Date(q.config.expiresAt).getTime() < Date.now()) return false;
            const name = q.config.messages.questName.toLowerCase();
            return !['orbs','товары','магазин','shop'].some(w => name.includes(w));
        });
    }

    async enrollAll() {
        const quests = this.getAvailableQuests().filter(q => !q.userStatus?.enrolledAt && !q.userStatus?.completedAt);
        for (const q of quests) await this.enrollQuest(q.id);
        this.showNotification(`✅ Принято заданий: ${quests.length}`, 3000);
    }

    async enrollQuest(id) {
        try {
            const res = await this.api.post({
                url: `/quests/${id}/enroll`,
                body: {
                    location: 11,
                    is_targeted: false,
                    metadata_sealed: null,
                    traffic_metadata_sealed: this._trafficMetadataSealed || "eyJrZXlfZmluZ2VycHJpbnQiOiI4ZGUwNzVmMiIsInBheWxvYWQiOiJBWHdMd2dLS1VHak52MEpoUDUwK1UzQUpkWS9FSXZPT0xTck9xRnJRZUNrbTdaT2FQWFRXVms4Z2VWdjFmVEduUEdlMWtHclNxUGJvU3d3V3dkc0hBK25UWW1jYUtXdFNOUStXM3JJPSJ9"
                }
            });
            if (res?.body?.traffic_metadata_sealed) {
                this._trafficMetadataSealed = res.body.traffic_metadata_sealed;
            }
            console.log('[QA] Задание принято:', id);
            await new Promise(r => setTimeout(r, 2000));
        } catch(e) {
            console.error('[QA] Ошибка при принятии:', e);
            this.showNotification('❌ Ошибка при принятии задания', 3000);
        }
        this.updateQuestList();
    }

    async completeAll() {
        const quests = this.getAvailableQuests().filter(q => q.userStatus?.enrolledAt && !q.userStatus?.completedAt);
        if (quests.length === 0) {
            this.showNotification('⚠️ Нет активных квестов для выполнения', 3000);
            return;
        }
        for (const q of quests) {
            this.activeTasks.set(q.id, { abort: false });
            this.completeQuest(q);
        }
        this.showNotification(`🚀 Запущено выполнение ${quests.length} квестов`, 3000);
    }

    async completeQuest(quest) {
        const task = this.activeTasks.get(quest.id) || { abort: false };
        this.activeTasks.set(quest.id, task);
        const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
        const taskType = Object.keys(taskConfig.tasks)[0];
        const target = taskConfig.tasks[taskType].target;

        if (!this.isApp && (taskType === "PLAY_ON_DESKTOP" || taskType === "STREAM_ON_DESKTOP")) {
            console.warn('[QA] Требуется десктопное приложение. Пропускаем:', quest.config.messages.questName);
            this.activeTasks.delete(quest.id);
            return;
        }

        try {
            if (taskType === "WATCH_VIDEO" || taskType === "WATCH_VIDEO_ON_MOBILE") {
                await this.runVideoTask(quest, target, task);
            } else if (taskType === "PLAY_ON_DESKTOP") {
                await this.runPlayTask(quest, target, task);
            } else if (taskType === "STREAM_ON_DESKTOP") {
                await this.runStreamTask(quest, target, task);
            } else if (taskType === "PLAY_ACTIVITY") {
                await this.runActivityTask(quest, target, task);
            }
            console.log('[QA] Задание выполнено:', quest.id);
        } catch(e) {
            console.error('[QA] Ошибка выполнения:', e);
            this.showNotification('❌ Ошибка при выполнении квеста', 3000);
        } finally {
            this.activeTasks.delete(quest.id);
            this.updateQuestList();
        }
    }

    async runVideoTask(quest, target, task) {
        let timestamp = quest.userStatus?.progress?.['WATCH_VIDEO']?.value ?? 0;
        while (timestamp < target) {
            if (task.abort) return;
            const step = Math.min(7, target - timestamp);
            timestamp += step;
            await this.api.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: Math.min(target, timestamp) } });
            await new Promise(r => setTimeout(r, 1000 * step));
        }
        await this.api.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: target } });
    }

    async runPlayTask(quest, target, task) {
        const appData = (await this.api.get({ url: `/applications/public?application_ids=${quest.config.application.id}` })).body[0];
        const fakeGame = {
            cmdLine: `C:\\Games\\${appData.name}\\game.exe`,
            exeName: `${appData.name}.exe`,
            exePath: `c:/games/${appData.name.toLowerCase()}/game.exe`,
            hidden: false, isLauncher: false,
            id: appData.id, name: appData.name,
            pid: Math.floor(Math.random() * 30000) + 1000,
            pidPath: [Math.floor(Math.random() * 30000) + 1000],
            processName: appData.name, start: Date.now()
        };
        this.fakeGames = this.fakeGames || [];
        this.fakeGames.push(fakeGame);
        this.RunningGameStore.getRunningGames = () => this.fakeGames;
        this.RunningGameStore.getGameForPID = pid => this.fakeGames.find(g => g.pid === pid);
        this.Dispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [], added: [fakeGame], games: this.fakeGames });

        await new Promise(resolve => {
            const handler = data => {
                if (data.questId !== quest.id) return;
                const progress = quest.config.configVersion === 1
                    ? data.userStatus.streamProgressSeconds
                    : Math.floor(data.userStatus.progress[Object.keys(data.userStatus.progress)[0]].value);
                if (progress >= target) {
                    this.Dispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", handler);
                    this.fakeGames = this.fakeGames.filter(g => g !== fakeGame);
                    this.Dispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: this.fakeGames });
                    resolve();
                }
            };
            this.Dispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", handler);
        });
    }

    async runStreamTask(quest, target, task) {
        const streamObj = { id: quest.config.application.id, pid: Date.now(), sourceName: null };
        this.fakeStreams = this.fakeStreams || [];
        this.fakeStreams.push(streamObj);
        this.ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => streamObj;

        await new Promise(resolve => {
            const handler = data => {
                if (data.questId !== quest.id) return;
                const progress = quest.config.configVersion === 1
                    ? data.userStatus.streamProgressSeconds
                    : Math.floor(data.userStatus.progress[Object.keys(data.userStatus.progress)[0]].value);
                if (progress >= target) {
                    this.Dispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", handler);
                    this.fakeStreams = this.fakeStreams.filter(s => s !== streamObj);
                    resolve();
                }
            };
            this.Dispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", handler);
        });
    }

    async runActivityTask(quest, target, task) {
        const privateChannelId = this.ChannelStore.getSortedPrivateChannels()[0]?.id;
        const guildVoiceChannelId = Object.values(this.GuildChannelStore.getAllGuilds()).find(x => x?.VOCAL?.length)?.VOCAL[0]?.channel?.id;
        const channelId = privateChannelId || guildVoiceChannelId;
        if (!channelId) return;
        const streamKey = `call:${channelId}:1`;

        while (true) {
            if (task.abort) return;
            const res = await this.api.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: false } });
            const progress = res.body.progress[Object.keys(res.body.progress)[0]].value;
            if (progress >= target) {
                await this.api.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: true } });
                break;
            }
            await new Promise(r => setTimeout(r, 20000));
        }
    }

    async claimAll() {
        const quests = this.getAvailableQuests().filter(q => q.userStatus?.completedAt && !q.userStatus?.claimedAt);
        if (quests.length === 0) {
            this.showNotification('⚠️ Нет завершённых квестов для получения наград', 3000);
            return;
        }
        await this.ensureModalClosed();
        this.showNotification(`🎁 Начинаю получение ${quests.length} наград...`, 2000);
        for (const q of quests) {
            await this.claimQuest(q.id);
            await new Promise(r => setTimeout(r, 3500));
        }
        this.updateQuestList();
        this.showNotification('✅ Награды обработаны', 3000);
    }

    async claimQuestWrapper(questId) {
        await this.ensureModalClosed();
        await this.claimQuest(questId);
        this.updateQuestList();
        this.showNotification('✅ Награда обработана', 3000);
    }

    async ensureModalClosed() {
        this.closeModal();
        await this.waitForModalRemoval();
        await new Promise(r => setTimeout(r, 800));
    }

    async claimQuest(id) {
        const claimTexts = ['получить награду', 'claim reward', 'забрать награду', 'get reward'];
        for (let attempt = 0; attempt < 30; attempt++) {
            const btn = this.findClaimButtonGlobal(claimTexts);
            if (btn) {
                console.log('[QA] Клик по кнопке получения награды для', id);
                btn.click();
                while (document.querySelector('iframe[src*="hcaptcha"], div[class*="captcha"]')) {
                    console.warn('[QA] Капча! Ожидайте решения...');
                    await new Promise(r => setTimeout(r, 3000));
                }
                return;
            }
            await new Promise(r => setTimeout(r, 500));
        }
        console.error('[QA] Кнопка получения награды не найдена для', id);
        this.showNotification('❌ Кнопка получения награды не найдена', 3000);
    }

    findClaimButtonGlobal(texts) {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
            const txt = btn.innerText.trim().toLowerCase();
            if (texts.some(t => txt.includes(t)) && !btn.disabled && btn.offsetParent !== null) {
                return btn;
            }
        }
        return null;
    }

    waitForModalRemoval() {
        return new Promise(resolve => {
            if (!document.getElementById('qa-modal-backdrop')) {
                resolve();
                return;
            }
            const observer = new MutationObserver(() => {
                if (!document.getElementById('qa-modal-backdrop')) {
                    observer.disconnect();
                    resolve();
                }
            });
            observer.observe(document.body, { childList: true, subtree: false });
            setTimeout(() => {
                observer.disconnect();
                resolve();
            }, 5000);
        });
    }

    checkQuests() {
        const quests = this.getAvailableQuests();
        const enrolled = quests.filter(q => q.userStatus?.enrolledAt).length;
        const completed = quests.filter(q => q.userStatus?.completedAt).length;
        const claimed = quests.filter(q => q.userStatus?.claimedAt).length;
        this.showNotification(
            `📊 Квестов: ${quests.length} | Принято: ${enrolled} | Завершено: ${completed} | Наград: ${claimed}`,
            6000
        );
        console.log('[QA] Квестов:', quests.length, quests.map(q => q.config.messages.questName));
    }

    stopAll() {
        console.log('[QA] stopAll вызван, активных задач:', this.activeTasks.size);
        if (this.activeTasks.size === 0) {
            this.showNotification('⚠️ Нет активных задач для остановки', 3000);
            return;
        }
        for (let [id, task] of this.activeTasks) task.abort = true;
        this.activeTasks.clear();
        this.restoreModules();
        this.showNotification('🛑 Все задачи остановлены', 3000);
        this.updateQuestList();
    }
};