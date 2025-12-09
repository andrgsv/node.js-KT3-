const express = require('express');
const ws = require('ws');
const app = express();

app.use(express.static('public'));

const server = app.listen(3000, () => {
    console.log('Чат запущен → http://localhost:3000');
});

const wss = new ws.Server({ server });
const clients = new Map(); 

wss.on('connection', (socket) => {
    let user = null;

    socket.on('message', (data) => {
        try {
            const msg = JSON.parse(data);

            // пользователь представляется
            if (msg.type === 'join' && !user) {
                user = { name: msg.name.trim(), color: msg.color };
                clients.set(socket, user);

                // уведомляем всех
                broadcast({
                    type: 'system',
                    text: `${user.name} присоединился к чату`
                });

                // приветствие новичку
                const names = Array.from(clients.values()).map(u => u.name);
                const welcome = names.length === 1
                    ? 'Добро пожаловать! Вы первый в чате.'
                    : `Добро пожаловать! В чате: ${names.join(', ')}`;

                socket.send(JSON.stringify({ type: 'welcome', text: welcome }));

                // обновляем список онлайн
                updateUserList();
                return;
            }

            // обычное сообщение
            if (msg.type === 'chat' && user) {
                const text = msg.text.trim();
                if (text) {
                    broadcast({
                        type: 'chat',
                        name: user.name,
                        color: user.color,
                        text: text
                    });
                }
            }
        } catch (e) {
            console.error('Ошибка:', e);
        }
    });

    socket.on('close', () => {
        if (user) {
            clients.delete(socket);
            broadcast({
                type: 'system',
                text: `${user.name} покинул чат`
            });
            updateUserList();
        }
    });
});

function broadcast(obj) {
    const data = JSON.stringify(obj);
    for (const [client, user] of clients) {
        if (client.readyState === ws.OPEN) {
            client.send(data);
        }
    }
}

function updateUserList() {
    const users = Array.from(clients.values());
    broadcast({ type: 'users', list: users });
}