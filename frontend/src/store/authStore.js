import { create } from 'zustand';

const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || '',
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null,
  onlineUsers: [], // Array of user IDs

  login: (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('userId', newUser._id);
    set({ token: newToken, user: newUser });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    set({ token: '', user: null, onlineUsers: [] });
  },

  updateUser: (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  setOnlineUsers: (userIds) => set({ onlineUsers: userIds }),
  addOnlineUser: (userId) => set((state) => ({
    onlineUsers: state.onlineUsers.includes(userId) ? state.onlineUsers : [...state.onlineUsers, String(userId)]
  })),
  removeOnlineUser: (userId) => set((state) => ({
    onlineUsers: state.onlineUsers.filter(id => id !== String(userId))
  }))
}));

export default useAuthStore;
