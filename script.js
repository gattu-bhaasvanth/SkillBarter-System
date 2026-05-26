class SkillBarter {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.messages = [];
        this.activeChat = null;
        this.checkAuth();
    }

    checkAuth() {
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            this.currentUser = user;
            await this.loadCurrentUserData();
            this.init();
        });
    }

    async loadCurrentUserData() {
        const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
        if (userDoc.exists) {
            let userData = userDoc.data();
            // Backward compatibility: convert old string arrays to new object format
            userData = this.normalizeSkills(userData);
            this.currentUser = { ...this.currentUser, ...userData };
        }
    }

    // Normalize skills for backward compatibility
    normalizeSkills(userData) {
        if (userData.skillsOffered && userData.skillsOffered.length > 0) {
            if (typeof userData.skillsOffered[0] === 'string') {
                userData.skillsOffered = userData.skillsOffered.map(skill => ({
                    name: skill,
                    level: 'Beginner'
                }));
            }
        }
        if (userData.skillsWanted && userData.skillsWanted.length > 0) {
            if (typeof userData.skillsWanted[0] === 'string') {
                userData.skillsWanted = userData.skillsWanted.map(skill => ({
                    name: skill,
                    level: 'Beginner'
                }));
            }
        }
        return userData;
    }

    init() {
        this.setupNavigation();
        this.setupProfileForm();
        this.setupMessaging();
        this.setupLogout();
        this.loadUsers();
        this.displayCurrentUser();
        this.listenToMessages();
    }

    setupLogout() {
        document.getElementById('logoutBtn').addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await auth.signOut();
                window.location.href = 'login.html';
            } catch (error) {
                alert('Error logging out');
            }
        });
    }

    displayCurrentUser() {
        const currentUserName = document.getElementById('currentUserName');
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const mySkillsCount = document.getElementById('mySkillsCount');
        const myWantsCount = document.getElementById('myWantsCount');
        
        if (currentUserName) currentUserName.textContent = this.currentUser.name || this.currentUser.email;
        if (profileName) profileName.textContent = this.currentUser.name || 'Your Name';
        if (profileEmail) profileEmail.textContent = this.currentUser.email;
        if (mySkillsCount) mySkillsCount.textContent = (this.currentUser.skillsOffered || []).length;
        if (myWantsCount) myWantsCount.textContent = (this.currentUser.skillsWanted || []).length;
    }

    async loadUsers() {
        const usersList = document.getElementById('usersList');
        const matchesList = document.getElementById('matchesList');
        const topMatchesList = document.getElementById('topMatchesList');
        
        usersList.classList.add('loading');
        if (matchesList) matchesList.classList.add('loading');
        if (topMatchesList) topMatchesList.classList.add('loading');
        
        const usersSnapshot = await db.collection('users').get();
        this.users = usersSnapshot.docs.map(doc => this.normalizeSkills(doc.data()));
        
        usersList.classList.remove('loading');
        if (matchesList) matchesList.classList.remove('loading');
        if (topMatchesList) topMatchesList.classList.remove('loading');
        
        this.displayUsers();
        this.displayMatches();
        this.displayTopMatches();
        this.updateStats();
    }

    updateStats() {
        const totalUsers = document.getElementById('totalUsers');
        const totalMatches = document.getElementById('totalMatches');
        const totalSkills = document.getElementById('totalSkills');
        
        if (totalUsers) totalUsers.textContent = this.users.length;
        if (totalMatches) totalMatches.textContent = this.findMatches().length;
        
        const allSkills = new Set();
        this.users.forEach(user => {
            if (user.skillsOffered) {
                user.skillsOffered.forEach(skill => {
                    const skillName = typeof skill === 'string' ? skill : skill.name;
                    allSkills.add(skillName);
                });
            }
        });
        if (totalSkills) totalSkills.textContent = allSkills.size;
    }

    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (btn.id === 'logoutBtn') return;
                
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.section').forEach(s => {
                    s.classList.remove('active');
                    s.classList.remove('section-transition');
                });
                
                e.target.classList.add('active');
                const sectionId = e.target.id.replace('Btn', 'Section');
                const section = document.getElementById(sectionId);
                if (section) {
                    section.classList.add('active');
                    section.classList.add('section-transition');
                    if (sectionId === 'matchesSection') this.displayMatches();
                    if (sectionId === 'messagesSection') this.displayConversations();
                }
            });
        });
    }

    setupProfileForm() {
        const form = document.getElementById('profileForm');
        
        if (this.currentUser) {
            document.getElementById('userName').value = this.currentUser.name || '';
            document.getElementById('userEmail').value = this.currentUser.email || '';
            
            // Load skills with levels
            this.loadSkillFields('offered', this.currentUser.skillsOffered || []);
            this.loadSkillFields('wanted', this.currentUser.skillsWanted || []);
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProfile();
        });
    }

    loadSkillFields(type, skills) {
        const container = document.getElementById(`skills${type === 'offered' ? 'Offered' : 'Wanted'}Container`);
        container.innerHTML = '';
        
        if (skills.length === 0) {
            this.addSkillField(type);
        } else {
            skills.forEach(skill => {
                this.addSkillField(type, skill.name, skill.level);
            });
        }
    }

    addSkillField(type, skillName = '', skillLevel = 'Beginner') {
        const container = document.getElementById(`skills${type === 'offered' ? 'Offered' : 'Wanted'}Container`);
        const row = document.createElement('div');
        row.className = 'skill-input-row';
        row.innerHTML = `
            <input type="text" placeholder="Skill name (e.g., Python, Guitar)" value="${skillName}">
            <select>
                <option value="Beginner" ${skillLevel === 'Beginner' ? 'selected' : ''}>Beginner</option>
                <option value="Intermediate" ${skillLevel === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                <option value="Expert" ${skillLevel === 'Expert' ? 'selected' : ''}>Expert</option>
            </select>
            <button type="button" class="remove-skill-btn" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(row);
    }

    async saveProfile() {
        const name = document.getElementById('userName').value;
        
        // Collect skills with levels
        const skillsOffered = this.collectSkills('offered');
        const skillsWanted = this.collectSkills('wanted');

        try {
            await db.collection('users').doc(this.currentUser.uid).set({
                uid: this.currentUser.uid,
                name,
                email: this.currentUser.email,
                skillsOffered,
                skillsWanted,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            this.currentUser.name = name;
            this.currentUser.skillsOffered = skillsOffered;
            this.currentUser.skillsWanted = skillsWanted;

            alert('Profile saved successfully!');
            await this.loadUsers();
            this.displayCurrentUser();
        } catch (error) {
            console.error('Error details:', error);
            alert('Error saving profile: ' + error.message);
        }
    }

    collectSkills(type) {
        const container = document.getElementById(`skills${type === 'offered' ? 'Offered' : 'Wanted'}Container`);
        const rows = container.querySelectorAll('.skill-input-row');
        const skills = [];
        
        rows.forEach(row => {
            const name = row.querySelector('input').value.trim();
            const level = row.querySelector('select').value;
            if (name) {
                skills.push({ name, level });
            }
        });
        
        return skills;
    }

    renderSkillBadge(skill, isOffered = true) {
        const skillName = typeof skill === 'string' ? skill : skill.name;
        const skillLevel = typeof skill === 'string' ? 'Beginner' : skill.level;
        const levelClass = skillLevel.toLowerCase();
        
        return `<span class="skill-badge ${levelClass}">
            <span class="skill-name">${skillName}</span>
            <span class="skill-level">(${skillLevel})</span>
        </span>`;
    }

    displayUsers() {
        const usersList = document.getElementById('usersList');
        const otherUsers = this.users.filter(u => u.uid !== this.currentUser.uid);
        
        usersList.innerHTML = '';
        
        if (otherUsers.length) {
            otherUsers.forEach((user, index) => {
                const card = document.createElement('div');
                card.className = 'user-card';
                card.style.animationDelay = `${index * 0.05}s`;
                card.innerHTML = `
                    <h4>${user.name || user.email}</h4>
                    <div class="skills">
                        <strong><i class="fas fa-chalkboard-teacher"></i> Offers:</strong>
                        ${(user.skillsOffered || []).map(s => this.renderSkillBadge(s, true)).join('')}
                    </div>
                    <div class="skills">
                        <strong><i class="fas fa-graduation-cap"></i> Wants:</strong>
                        ${(user.skillsWanted || []).map(s => this.renderSkillBadge(s, false)).join('')}
                    </div>
                    <button class="contact-btn" onclick="app.contactUser('${user.email}')">
                        <i class="fas fa-envelope"></i> Contact
                    </button>
                    <button class="message-btn" onclick="app.startChat('${user.uid}')">
                        <i class="fas fa-comments"></i> Message
                    </button>
                `;
                usersList.appendChild(card);
            });
        } else {
            usersList.innerHTML = '<div class="user-card"><p>No other users found. Invite friends to join!</p></div>';
        }
    }

    displayMatches() {
        const matchesList = document.getElementById('matchesList');
        const matches = this.findMatches();
        
        matchesList.innerHTML = '';
        
        if (matches.length) {
            matches.forEach((match, index) => {
                const card = document.createElement('div');
                card.className = 'match-card';
                card.style.animationDelay = `${index * 0.05}s`;
                card.innerHTML = `
                    <h4>
                        <span><i class="fas fa-user"></i> ${match.user.name || match.user.email}</span>
                        <span class="match-score">${match.score}% Match</span>
                    </h4>
                    <p><strong><i class="fas fa-arrow-right"></i> You can teach:</strong></p>
                    <div>${match.youTeach.map(s => this.renderSkillBadge(s, true)).join('') || 'None'}</div>
                    <p><strong><i class="fas fa-arrow-left"></i> They can teach:</strong></p>
                    <div>${match.theyTeach.map(s => this.renderSkillBadge(s, false)).join('') || 'None'}</div>
                    <button class="contact-btn" onclick="app.contactUser('${match.user.email}')">
                        <i class="fas fa-handshake"></i> Connect
                    </button>
                    <button class="message-btn" onclick="app.startChat('${match.user.uid}')">
                        <i class="fas fa-comments"></i> Message
                    </button>
                `;
                matchesList.appendChild(card);
            });
        } else {
            matchesList.innerHTML = '<div class="match-card"><p>No matches found. Update your skills to find more matches!</p></div>';
        }
    }

    findMatches() {
        if (!this.currentUser || !this.currentUser.skillsOffered || !this.currentUser.skillsWanted) return [];
        
        return this.users
            .filter(u => u.uid !== this.currentUser.uid)
            .map(user => {
                const youTeach = [];
                const theyTeach = [];
                let levelBonus = 0;
                
                // Find matching skills you can teach
                (this.currentUser.skillsOffered || []).forEach(mySkill => {
                    const myName = typeof mySkill === 'string' ? mySkill : mySkill.name;
                    const myLevel = typeof mySkill === 'string' ? 'Beginner' : mySkill.level;
                    
                    (user.skillsWanted || []).forEach(theirSkill => {
                        const theirName = typeof theirSkill === 'string' ? theirSkill : theirSkill.name;
                        const theirLevel = typeof theirSkill === 'string' ? 'Beginner' : theirSkill.level;
                        
                        if (myName.toLowerCase().includes(theirName.toLowerCase()) || 
                            theirName.toLowerCase().includes(myName.toLowerCase())) {
                            youTeach.push(mySkill);
                            levelBonus += this.calculateLevelBonus(myLevel, theirLevel);
                        }
                    });
                });
                
                // Find matching skills they can teach
                (user.skillsOffered || []).forEach(theirSkill => {
                    const theirName = typeof theirSkill === 'string' ? theirSkill : theirSkill.name;
                    const theirLevel = typeof theirSkill === 'string' ? 'Beginner' : theirSkill.level;
                    
                    (this.currentUser.skillsWanted || []).forEach(mySkill => {
                        const myName = typeof mySkill === 'string' ? mySkill : mySkill.name;
                        const myLevel = typeof mySkill === 'string' ? 'Beginner' : mySkill.level;
                        
                        if (theirName.toLowerCase().includes(myName.toLowerCase()) || 
                            myName.toLowerCase().includes(theirName.toLowerCase())) {
                            theyTeach.push(theirSkill);
                            levelBonus += this.calculateLevelBonus(theirLevel, myLevel);
                        }
                    });
                });
                
                const totalPossible = this.currentUser.skillsOffered.length + this.currentUser.skillsWanted.length;
                const baseScore = totalPossible > 0 ? ((youTeach.length + theyTeach.length) / totalPossible) * 100 : 0;
                const score = Math.min(100, Math.round(baseScore + levelBonus));
                
                return { user, youTeach, theyTeach, score };
            })
            .filter(match => match.score > 0)
            .sort((a, b) => b.score - a.score);
    }

    calculateLevelBonus(teacherLevel, learnerLevel) {
        const levels = { 'Beginner': 1, 'Intermediate': 2, 'Expert': 3 };
        const teacherValue = levels[teacherLevel] || 1;
        const learnerValue = levels[learnerLevel] || 1;
        
        // Expert teaching Beginner = highest bonus
        if (teacherValue > learnerValue) {
            return (teacherValue - learnerValue) * 5;
        }
        // Same level = moderate bonus
        if (teacherValue === learnerValue) {
            return 3;
        }
        // Lower level teaching higher = small bonus
        return 1;
    }

    contactUser(email) {
        window.location.href = `mailto:${email}?subject=SkillBarter Connection&body=Hi! I found your profile on SkillBarter and would like to connect for skill exchange.`;
    }

    setupMessaging() {
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    listenToMessages() {
        db.collection('messages')
            .where('participants', 'array-contains', this.currentUser.uid)
            .onSnapshot((snapshot) => {
                this.messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.updateUnreadCount();
                if (this.activeChat) {
                    this.displayMessages(this.activeChat);
                }
            });
    }

    startChat(userId) {
        this.activeChat = userId;
        document.getElementById('messagesBtn').click();
        setTimeout(() => this.openChat(userId), 100);
    }

    displayConversations() {
        const conversationsList = document.getElementById('conversationsList');
        const conversations = this.getConversations();
        
        conversationsList.innerHTML = conversations.length ?
            conversations.map(conv => {
                const unread = this.getUnreadCount(conv.userId);
                return `
                    <div class="conversation-item" onclick="app.openChat('${conv.userId}')">
                        <h4>${conv.userName} ${unread > 0 ? '<span class="unread-indicator"></span>' : ''}</h4>
                        <p>${conv.lastMessage ? conv.lastMessage.text : 'Start a conversation'}</p>
                    </div>
                `;
            }).join('') : '<p>No conversations yet. Start messaging users!</p>';
    }

    getConversations() {
        const userIds = new Set();
        this.messages.forEach(msg => {
            if (msg.senderId === this.currentUser.uid) userIds.add(msg.receiverId);
            if (msg.receiverId === this.currentUser.uid) userIds.add(msg.senderId);
        });
        
        return Array.from(userIds).map(userId => {
            const user = this.users.find(u => u.uid === userId);
            const userMessages = this.messages.filter(m => 
                (m.senderId === this.currentUser.uid && m.receiverId === userId) ||
                (m.senderId === userId && m.receiverId === this.currentUser.uid)
            ).sort((a, b) => a.timestamp - b.timestamp);
            
            return {
                userId,
                userName: user?.name || user?.email || 'Unknown',
                lastMessage: userMessages[userMessages.length - 1]
            };
        });
    }

    openChat(userId) {
        this.activeChat = userId;
        const user = this.users.find(u => u.uid === userId);
        
        document.getElementById('chatHeader').innerHTML = `<i class="fas fa-user"></i> ${user?.name || user?.email || 'Unknown'}`;
        document.getElementById('messageInputArea').style.display = 'flex';
        
        this.markAsRead(userId);
        this.displayMessages(userId);
        this.updateUnreadCount();
        
        document.querySelectorAll('.conversation-item').forEach(item => item.classList.remove('active'));
        if (event && event.target) {
            event.target.closest('.conversation-item')?.classList.add('active');
        }
    }

    displayMessages(userId) {
        const messagesDisplay = document.getElementById('messagesDisplay');
        const chatMessages = this.messages.filter(m => 
            (m.senderId === this.currentUser.uid && m.receiverId === userId) ||
            (m.senderId === userId && m.receiverId === this.currentUser.uid)
        ).sort((a, b) => a.timestamp - b.timestamp);
        
        messagesDisplay.innerHTML = chatMessages.length ?
            chatMessages.map(msg => `
                <div class="message ${msg.senderId === this.currentUser.uid ? 'sent' : 'received'}">
                    ${msg.text}
                    <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
            `).join('') : '<p style="text-align:center;color:rgba(255,255,255,0.6);">No messages yet. Start the conversation!</p>';
        
        messagesDisplay.scrollTop = messagesDisplay.scrollHeight;
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        
        if (!text || !this.activeChat) return;
        
        try {
            await db.collection('messages').add({
                senderId: this.currentUser.uid,
                receiverId: this.activeChat,
                text,
                timestamp: Date.now(),
                read: false,
                participants: [this.currentUser.uid, this.activeChat]
            });
            
            input.value = '';
        } catch (error) {
            alert('Error sending message');
        }
    }

    async markAsRead(userId) {
        const unreadMessages = this.messages.filter(m => 
            m.senderId === userId && m.receiverId === this.currentUser.uid && !m.read
        );
        
        for (const msg of unreadMessages) {
            try {
                await db.collection('messages').doc(msg.id).update({ read: true });
            } catch (error) {
                console.error('Error marking message as read');
            }
        }
    }

    getUnreadCount(userId) {
        return this.messages.filter(m => 
            m.senderId === userId && m.receiverId === this.currentUser.uid && !m.read
        ).length;
    }

    updateUnreadCount() {
        const total = this.messages.filter(m => 
            m.receiverId === this.currentUser.uid && !m.read
        ).length;
        const badge = document.getElementById('unreadBadge');
        if (badge) {
            badge.textContent = total;
            badge.style.display = total > 0 ? 'inline' : 'none';
        }
    }

    displayTopMatches() {
        const topMatchesList = document.getElementById('topMatchesList');
        if (!topMatchesList) return;
        
        const matches = this.findMatches().slice(0, 5);
        
        topMatchesList.innerHTML = matches.length ?
            matches.map(match => `
                <div class="match-item" onclick="app.startChat('${match.user.uid}')">
                    <h5>${match.user.name || match.user.email}</h5>
                    <span class="match-score">${match.score}%</span>
                    <p style="color: rgba(255,255,255,0.7); font-size: 0.8rem; margin-top: 0.5rem;">
                        ${match.youTeach.slice(0, 2).map(s => typeof s === 'string' ? s : s.name).join(', ')}${match.youTeach.length > 2 ? '...' : ''}
                    </p>
                </div>
            `).join('') : '<p style="color: rgba(255,255,255,0.6); font-size: 0.9rem;">No matches yet. Add skills to your profile!</p>';
    }
}

window.app = new SkillBarter();