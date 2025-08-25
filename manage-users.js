#!/usr/bin/env node

const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const readline = require('readline');

const USERS_FILE = 'users.json';

// Создаем интерфейс для чтения ввода
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Функция для чтения файла пользователей
async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log('📝 Создаю новый файл пользователей...');
    return {
      users: [],
      settings: {
        maxLoginAttempts: 5,
        sessionTimeout: 3600,
        passwordMinLength: 8
      }
    };
  }
}

// Функция для сохранения пользователей
async function saveUsers(usersData) {
  await fs.writeFile(USERS_FILE, JSON.stringify(usersData, null, 2));
  console.log('✅ Пользователи сохранены в', USERS_FILE);
}

// Функция для хеширования пароля
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Функция для генерации ID
function generateId() {
  return Date.now().toString();
}

// Функция для добавления пользователя
async function addUser() {
  console.log('\n👤 Добавление нового пользователя');
  console.log('===============================');
  
  const username = await question('Введите имя пользователя: ');
  const email = await question('Введите email: ');
  const password = await question('Введите пароль: ');
  const role = await question('Введите роль (admin/editor): ') || 'editor';
  
  if (!username || !email || !password) {
    console.log('❌ Все поля обязательны!');
    return;
  }
  
  const usersData = await loadUsers();
  
  // Проверяем, не существует ли уже пользователь
  const existingUser = usersData.users.find(u => u.username === username || u.email === email);
  if (existingUser) {
    console.log('❌ Пользователь с таким именем или email уже существует!');
    return;
  }
  
  // Создаем нового пользователя
  const hashedPassword = await hashPassword(password);
  const newUser = {
    id: generateId(),
    username,
    email,
    password: hashedPassword,
    role,
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: null
  };
  
  usersData.users.push(newUser);
  await saveUsers(usersData);
  
  console.log('✅ Пользователь добавлен успешно!');
  console.log('📧 Email:', email);
  console.log('🔑 Роль:', role);
}

// Функция для удаления пользователя
async function removeUser() {
  console.log('\n🗑️  Удаление пользователя');
  console.log('========================');
  
  const usersData = await loadUsers();
  
  if (usersData.users.length === 0) {
    console.log('❌ Нет пользователей для удаления');
    return;
  }
  
  console.log('Список пользователей:');
  usersData.users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.username} (${user.email}) - ${user.role}`);
  });
  
  const userIndex = parseInt(await question('Введите номер пользователя для удаления: ')) - 1;
  
  if (userIndex < 0 || userIndex >= usersData.users.length) {
    console.log('❌ Неверный номер пользователя!');
    return;
  }
  
  const userToRemove = usersData.users[userIndex];
  
  if (userToRemove.username === 'admin') {
    console.log('❌ Нельзя удалить главного администратора!');
    return;
  }
  
  const confirm = await question(`Удалить пользователя "${userToRemove.username}"? (y/N): `);
  
  if (confirm.toLowerCase() === 'y') {
    usersData.users.splice(userIndex, 1);
    await saveUsers(usersData);
    console.log('✅ Пользователь удален!');
  } else {
    console.log('❌ Удаление отменено');
  }
}

// Функция для изменения пароля
async function changePassword() {
  console.log('\n🔑 Изменение пароля');
  console.log('==================');
  
  const usersData = await loadUsers();
  
  if (usersData.users.length === 0) {
    console.log('❌ Нет пользователей');
    return;
  }
  
  console.log('Список пользователей:');
  usersData.users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.username} (${user.email})`);
  });
  
  const userIndex = parseInt(await question('Введите номер пользователя: ')) - 1;
  
  if (userIndex < 0 || userIndex >= usersData.users.length) {
    console.log('❌ Неверный номер пользователя!');
    return;
  }
  
  const user = usersData.users[userIndex];
  const newPassword = await question(`Введите новый пароль для "${user.username}": `);
  
  if (!newPassword) {
    console.log('❌ Пароль не может быть пустым!');
    return;
  }
  
  const hashedPassword = await hashPassword(newPassword);
  user.password = hashedPassword;
  
  await saveUsers(usersData);
  console.log('✅ Пароль изменен!');
}

// Функция для просмотра пользователей
async function listUsers() {
  console.log('\n📋 Список пользователей');
  console.log('======================');
  
  const usersData = await loadUsers();
  
  if (usersData.users.length === 0) {
    console.log('❌ Нет пользователей');
    return;
  }
  
  usersData.users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.username} (${user.email})`);
    console.log(`   Роль: ${user.role}`);
    console.log(`   Статус: ${user.isActive ? '✅ Активен' : '❌ Неактивен'}`);
    console.log(`   Создан: ${new Date(user.createdAt).toLocaleDateString()}`);
    if (user.lastLogin) {
      console.log(`   Последний вход: ${new Date(user.lastLogin).toLocaleDateString()}`);
    }
    console.log('');
  });
}

// Функция для вопроса пользователю
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Главное меню
async function showMenu() {
  console.log('\n🔐 Управление пользователями админки ARTBAT Prague');
  console.log('================================================');
  console.log('1. 📋 Список пользователей');
  console.log('2. 👤 Добавить пользователя');
  console.log('3. 🗑️  Удалить пользователя');
  console.log('4. 🔑 Изменить пароль');
  console.log('5. 🚪 Выход');
  console.log('');
  
  const choice = await question('Выберите действие (1-5): ');
  
  switch (choice) {
    case '1':
      await listUsers();
      break;
    case '2':
      await addUser();
      break;
    case '3':
      await removeUser();
      break;
    case '4':
      await changePassword();
      break;
    case '5':
      console.log('👋 До свидания!');
      rl.close();
      return;
    default:
      console.log('❌ Неверный выбор!');
  }
  
  // Показываем меню снова
  await showMenu();
}

// Запуск программы
async function main() {
  try {
    await showMenu();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    rl.close();
  }
}

// Обработка выхода
rl.on('close', () => {
  process.exit(0);
});

// Запускаем программу
main();
