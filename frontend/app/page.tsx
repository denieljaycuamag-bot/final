'use client';
import { useAuth } from '@/lib/AuthContext';
import Login from '@/components/Login';
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  const { user } = useAuth();

  return user ? <ChatInterface /> : <Login />;
}//d