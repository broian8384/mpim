import React from 'react';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';

export default function Layout({ children }) {
    return (
        <div className="flex min-h-screen bg-slate-50">
            <CommandPalette />
            <Sidebar />
            <main className="flex-1 overflow-x-hidden overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
