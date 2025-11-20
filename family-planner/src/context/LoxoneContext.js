import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const LoxoneContext = createContext();

export const useLoxone = () => {
  const context = useContext(LoxoneContext);
  if (!context) {
    throw new Error('useLoxone must be used within a LoxoneProvider');
  }
  return context;
};

export const LoxoneProvider = ({ children }) => {
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [tempAccess, setTempAccess] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [musicFavorites] = useState([
    { id: 1, name: 'Jazz Favorites' },
    { id: 2, name: 'Workout Mix' },
    { id: 3, name: 'Classical' },
    { id: 4, name: 'Ambient' },
    { id: 5, name: 'Rock Classics' }
  ]);

  // Load family members from backend
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getFamilyMembers();
      // Map backend format to Loxone format
      const mappedUsers = data.map(member => ({
        uuid: member.id,
        name: member.name,
        userid: member.id,
        firstName: member.name,
        lastName: '',
        email: member.email || '',
        userRights: 4294967295,
        isAdmin: member.isAdmin === 1,
        nfcTags: [],
        status: member.status || 'away',
        location: ''
      }));
      setUsers(mappedUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize data - Load from backend instead of localStorage
  useEffect(() => {
    loadUsers();
    
    // For now, keep rooms in localStorage until we add Loxone integration
    const storedRooms = localStorage.getItem('loxone_rooms');
    const storedTempAccess = localStorage.getItem('loxone_temp_access');

    if (storedRooms) {
      setRooms(JSON.parse(storedRooms));
    } else {
      const defaultRooms = [
        { uuid: '1e052949-01', name: 'Living Room', category: 'CENTRAL', temperature: 22, targetTemp: 22, occupied: true, status: 'Occupied' },
        { uuid: '1e052949-02', name: 'Home Office', category: 'CENTRAL', temperature: 21, targetTemp: 21, occupied: true, status: 'Do Not Disturb', locked: true },
        { uuid: '1e052949-03', name: 'Master Bedroom', category: 'UPSTAIRS', temperature: 20, targetTemp: 20, occupied: false, status: 'Ready' },
        { uuid: '1e052949-04', name: 'Home Gym', category: 'BASEMENT', temperature: 20, targetTemp: 20, occupied: false, status: 'Ready' },
        { uuid: '1e052949-05', name: 'Kids Room', category: 'UPSTAIRS', temperature: 22, targetTemp: 22, occupied: true, status: 'Occupied' },
        { uuid: '1e052949-06', name: 'Media Room', category: 'BASEMENT', temperature: 21, targetTemp: 21, occupied: false, status: 'Available' },
        { uuid: '1e052949-07', name: 'Kitchen', category: 'CENTRAL', temperature: 22, targetTemp: 22, occupied: false, status: 'Available' },
        { uuid: '1e052949-08', name: 'Music Room', category: 'CENTRAL', temperature: 21, targetTemp: 21, occupied: false, status: 'Available' }
      ];
      setRooms(defaultRooms);
      localStorage.setItem('loxone_rooms', JSON.stringify(defaultRooms));
    }

    if (storedTempAccess) {
      setTempAccess(JSON.parse(storedTempAccess));
    }
  }, [loadUsers]);

  // Auto-save to localStorage whenever state changes
  useEffect(() => {
    if (rooms.length > 0) {
      localStorage.setItem('loxone_rooms', JSON.stringify(rooms));
    }
  }, [rooms]);

  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('loxone_users', JSON.stringify(users));
    }
  }, [users]);

  useEffect(() => {
    localStorage.setItem('loxone_temp_access', JSON.stringify(tempAccess));
  }, [tempAccess]);

  // API methods
  const updateRoom = (uuid, updates) => {
    setRooms(prevRooms => 
      prevRooms.map(room => 
        room.uuid === uuid ? { ...room, ...updates } : room
      )
    );
  };

  const addUser = async (userData) => {
    try {
      // Create member in backend database
      const newMember = {
        id: generateUUID(),
        name: userData.name,
        role: userData.role || '',
        email: userData.email,
        status: userData.status || 'away',
        avatar: userData.avatar || userData.name.charAt(0),
        isAdmin: userData.admin || false
      };
      
      await api.addFamilyMember(newMember);
      
      // Reload users from backend
      await loadUsers();
      
      return newMember;
    } catch (error) {
      console.error('Failed to add user:', error);
      throw error;
    }
  };

  const updateUser = async (uuid, updates) => {
    try {
      // Update in backend database
      await api.updateFamilyMember(uuid, {
        name: updates.name,
        role: updates.role,
        email: updates.email,
        status: updates.status,
        avatar: updates.avatar,
        isAdmin: updates.admin
      });
      
      // Reload users from backend
      await loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  const deleteUser = async (uuid) => {
    try {
      // Delete from backend database
      await api.deleteFamilyMember(uuid);
      
      // Reload users from backend
      await loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  };

  const grantTempAccess = (userId, validUntil) => {
    const access = {
      id: generateUUID(),
      userId,
      nfcId: generateNFCId(),
      validUntil,
      active: true,
      createdAt: new Date().toISOString()
    };
    setTempAccess(prevAccess => [...prevAccess, access]);
    return access;
  };

  const revokeTempAccess = (accessId) => {
    setTempAccess(prevAccess => prevAccess.filter(a => a.id !== accessId));
  };

  const generateUUID = () => {
    return '1e' + Math.random().toString(16).substring(2, 8) + '-' + 
           Math.random().toString(16).substring(2, 6) + '-' +
           Math.random().toString(16).substring(2, 6) + '-ffff' +
           Math.random().toString(16).substring(2, 14);
  };

  const generateNFCId = () => {
    const bytes = [];
    for (let i = 0; i < 9; i++) {
      bytes.push(Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0'));
    }
    return bytes.join(' ');
  };

  const value = {
    rooms,
    users,
    tempAccess,
    musicFavorites,
    updateRoom,
    addUser,
    updateUser,
    deleteUser,
    grantTempAccess,
    revokeTempAccess
  };

  return (
    <LoxoneContext.Provider value={value}>
      {children}
    </LoxoneContext.Provider>
  );
};
