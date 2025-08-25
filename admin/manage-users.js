#!/usr/bin/env node

const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'users.json');

// Функция для загрузки пользователей
async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка загрузки пользователей:', error.message);
    return { users: [], roles: {} };
  }
}

// Функция для сохранения пользователей
async function saveUsers(data) {
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));
    console.log('✅ Пользователи сохранены');
  } catch (error) {
    console.error('❌ Ошибка сохранения пользователей:', error.message);
  }
}

// Функция для создания нового пользователя
async function createUser(username, password, role = 'editor', name = '', email = '') {
  const data = await loadUsers();
  
  // Проверяем, не существует ли уже пользователь
  const existingUser = data.users.find(user => user.username === username);
  if (existingUser) {
    console.log('❌ Пользователь с таким именем уже существует');
    return false;
  }
  
  // Хешируем пароль
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Создаем нового пользователя
  const newUser = {
    id: Date.now(),
    username,
    password: hashedPassword,
    role,
    name: name || username,
    email,
    created: new Date().toISOString(),
    active: true
  };
  
  data.users.push(newUser);
  await saveUsers(data);
  
  console.log(`✅ Пользователь ${username} создан успешно`);
  console.log(`   Роль: ${role}`);
  console.log(`   Пароль: ${password}`);
  return true;
}

// Функция для удаления пользователя
async function deleteUser(username) {
  const data = await loadUsers();
  
  const userIndex = data.users.findIndex(user => user.username === username);
  if (userIndex === -1) {
    console.log('❌ Пользователь не найден');
    return false;
  }
  
  // Не позволяем удалить главного админа
  if (data.users[userIndex].username === 'admin') {
    console.log('❌ Нельзя удалить главного администратора');
    return false;
  }
  
  data.users.splice(userIndex, 1);
  await saveUsers(data);
  
  console.log(`✅ Пользователь ${username} удален`);
  return true;
}

// Функция для изменения пароля
async function changePassword(username, newPassword) {
  const data = await loadUsers();
  
  const user = data.users.find(user => user.username === username);
  if (!user) {
    console.log('❌ Пользователь не найден');
    return false;
  }
  
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  
  await saveUsers(data);
  
  console.log(`✅ Пароль для ${username} изменен`);
  return true;
}

// Функция для списка пользователей
async function listUsers() {
  const data = await loadUsers();
  
  console.log('\n📋 Список пользователей:');
  console.log('─'.repeat(80));
  
  data.users.forEach(user => {
    const status = user.active ? '✅' : '❌';
    console.log(`${status} ${user.username} (${user.role})`);
    console.log(`   Имя: ${user.name}`);
    console.log(`   Email: ${user.email || 'не указан'}`);
    console.log(`   Создан: ${new Date(user.created).toLocaleDateString()}`);
    console.log('');
  });
}

// Функция для генерации пароля
function generatePassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Основная функция
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  switch (command) {
    case 'create':
      if (args.length < 2) {
        console.log('Использование: node manage-users.js create <username> <password> [role] [name] [email]');
        console.log('Роли: admin, editor, viewer');
        return;
      }
      const [username, password, role = 'editor', name = '', email = ''] = args;
      await createUser(username, password, role, name, email);
      break;
      
    case 'delete':
      if (args.length < 1) {
        console.log('Использование: node manage-users.js delete <username>');
        return;
      }
      await deleteUser(args[0]);
      break;
      
    case 'password':
      if (args.length < 2) {
        console.log('Использование: node manage-users.js password <username> <new_password>');
        return;
      }
      await changePassword(args[0], args[1]);
      break;
      
    case 'list':
      await listUsers();
      break;
      
    case 'generate':
      const length = args[0] || 12;
      const generatedPassword = generatePassword(parseInt(length));
      console.log(`🔐 Сгенерированный пароль: ${generatedPassword}`);
      break;
      
    default:
      console.log('🎛️  Управление пользователями ARTBAT Prague Admin');
      console.log('');
      console.log('Команды:');
      console.log('  create <username> <password> [role] [name] [email]  - Создать пользователя');
      console.log('  delete <username>                                  - Удалить пользователя');
      console.log('  password <username> <new_password>                - Изменить пароль');
      console.log('  list                                               - Список пользователей');
      console.log('  generate [length]                                 - Сгенерировать пароль');
      console.log('');
      console.log('Примеры:');
      console.log('  node manage-users.js create editor1 mypass123 editor "Иван Иванов" ivan@example.com');
      console.log('  node manage-users.js create viewer1 mypass456 viewer "Петр Петров"');
      console.log('  node manage-users.js password editor1 newpassword123');
      console.log('  node manage-users.js generate 16');
  }
}

// Запускаем скрипт
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  loadUsers,
  saveUsers,
  createUser,
  deleteUser,
  changePassword,
  generatePassword
};
