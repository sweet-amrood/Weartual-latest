// Mockup User Database
let users = [
  {
    id: 1,
    username: 'john_doe',
    email: 'john@example.com',
    password: 'password123',
    displayName: 'John Doe',
    uid: 'mock_uid_12345',
    createdAt: new Date('2024-01-15').toISOString(),
    isActive: true
  },
  {
    id: 2,
    username: 'jane_smith',
    email: 'jane@example.com',
    password: 'password123',
    displayName: 'Jane Smith',
    uid: 'mock_uid_67890',
    createdAt: new Date('2024-02-20').toISOString(),
    isActive: true
  },
  {
    id: 3,
    username: 'admin',
    email: 'admin@weartual.com',
    password: 'admin123',
    displayName: 'Admin User',
    uid: 'mock_uid_admin',
    createdAt: new Date('2024-01-01').toISOString(),
    isActive: true
  }
];

// Helper functions for user management
export const mockupUserService = {
  // Find user by email
  findByEmail: (email) => {
    return users.find(user => user.email.toLowerCase() === email.toLowerCase());
  },

  // Find user by username
  findByUsername: (username) => {
    return users.find(user => user.username.toLowerCase() === username.toLowerCase());
  },

  // Validate user credentials
  validateUser: (email, password) => {
    const user = mockupUserService.findByEmail(email);
    if (user && user.password === password && user.isActive) {
      // Return user object without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  },

  // Create new user
  createUser: (userData) => {
    // Check if email or username already exists
    const existingUserByEmail = mockupUserService.findByEmail(userData.email);
    const existingUserByUsername = mockupUserService.findByUsername(userData.username);
    
    if (existingUserByEmail) {
      throw new Error('Email already exists');
    }
    
    if (existingUserByUsername) {
      throw new Error('Username already exists');
    }

    const newUser = {
      id: users.length + 1,
      username: userData.username,
      email: userData.email,
      password: userData.password,
      displayName: userData.displayName || userData.username,
      uid: `mock_uid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    users.push(newUser);
    
    // Return user object without password
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  // Get all users (for debugging)
  getAllUsers: () => {
    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  },

  // Get user by UID
  findByUid: (uid) => {
    const user = users.find(u => u.uid === uid);
    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  },

  // Simulate Google OAuth
  googleAuth: (email, name) => {
    let user = mockupUserService.findByEmail(email);
    
    if (!user) {
      // Create new user from Google data
      const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
      user = mockupUserService.createUser({
        username,
        email,
        displayName: name || username,
        password: `google_${Date.now()}` // Random password for Google users
      });
    }
    
    return user;
  }
};

export default mockupUserService;
