import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Box, Trash2 } from 'lucide-react';
import RoomCreationModal from '../components/RoomCreationModal';

export default function Dashboard() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [palaces, setPalaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Load existing palaces
    useEffect(() => {
        async function loadPalaces() {
            const { data, error } = await supabase
                .from('palaces')
                .select('*')
                .order('created_at', { ascending: true }); // Ordering by creation to place them sequentially on map

            if (!error && data) {
                setPalaces(data);
            }
            setLoading(false);
        }

        if (user) {
            loadPalaces();
        }
    }, [user, isModalOpen]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    const handleDeletePalace = async (e, palaceId) => {
        e.stopPropagation(); // Don't navigate to the room
        
        if (!window.confirm("¿Estás seguro de que quieres demoler esta habitación? Se perderán todos los conceptos y el contexto del PDF.")) {
            return;
        }

        try {
            console.log("Attempting to delete palace via backend:", palaceId);
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) throw new Error("No session found");

            const response = await fetch(`http://localhost:8001/api/ingest/palace/${palaceId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to delete");
            }

            console.log("Successfully deleted room via backend");
            
            // Remove from local state
            setPalaces(palaces.filter(p => p.id !== palaceId));
            
        } catch (error) {
            console.error("Error deleting palace:", error);
            alert(`No se pudo eliminar la habitación: ${error.message}`);
        }
    };

    return (
        <div className="container" style={{ padding: '2rem 0', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 className="heading-glow" style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0 }}>NeuralHome</h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Architectural Blueprint - Level 1</p>
                </div>
                <button onClick={handleSignOut} className="btn-outline">Sign Out</button>
            </header>

            <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <button className="btn-neon" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} /> Construct New Room
                    </button>
                </div>

                {/* THE BLUEPRINT MAP */}
                <div style={{ 
                    flex: 1, 
                    border: '1px solid rgba(124, 58, 237, 0.4)', 
                    borderRadius: '16px', 
                    background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M60 60L0 60 0 0\' fill=\'none\' stroke=\'rgba(124, 58, 237, 0.1)\' stroke-width=\'1\'/%3E%3C/svg%3E") #05000b',
                    padding: '3rem',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    
                    {loading ? (
                        <p style={{ color: 'var(--primary-bright)' }} className="animate-float">Scanning architectural data...</p>
                    ) : palaces.length === 0 ? (
                        <div className="flex-center" style={{ flexDirection: 'column', gap: '1rem', background: 'rgba(5, 0, 11, 0.8)', padding: '2rem', borderRadius: '12px', border: '1px dashed var(--border-neon)' }}>
                            <p style={{ color: 'var(--text-muted)' }}>The House is empty. Start your Neural journey.</p>
                            <button className="btn-neon" onClick={() => setIsModalOpen(true)}>Initialize Architect</button>
                        </div>
                    ) : (
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                            gap: '3rem', 
                            width: '100%', 
                            height: '100%',
                            alignContent: 'start'
                        }}>
                            {palaces.map((palace, index) => (
                                <div 
                                    key={palace.id} 
                                    className="blueprint-room"
                                    onClick={() => navigate(`/palace/${palace.id}`)}
                                    style={{ 
                                        border: '2px solid var(--primary-bright)',
                                        background: 'rgba(124, 58, 237, 0.05)',
                                        padding: '2rem',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        minHeight: '200px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        transition: 'all 0.3s ease',
                                        boxShadow: 'inset 0 0 20px rgba(124, 58, 237, 0.1)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(124, 58, 237, 0.15)';
                                        e.currentTarget.style.transform = 'translateY(-5px)';
                                        e.currentTarget.style.boxShadow = '0 0 30px rgba(124, 58, 237, 0.3), inset 0 0 20px rgba(124, 58, 237, 0.2)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(124, 58, 237, 0.05)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(124, 58, 237, 0.1)';
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '1.5rem', margin: 0, color: '#fff', textShadow: '0 0 10px var(--primary-bright)', wordBreak: 'break-word', lineHeight: '1.2' }}>{palace.title}</h3>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                            <button 
                                                onClick={(e) => handleDeletePalace(e, palace.id)}
                                                style={{ 
                                                    background: 'transparent', 
                                                    border: 'none', 
                                                    color: 'rgba(255, 50, 50, 0.6)', 
                                                    cursor: 'pointer',
                                                    padding: '0.3rem',
                                                    borderRadius: '4px',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.color = '#ff4444'; e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 50, 50, 0.6)'; e.currentTarget.style.background = 'transparent'; }}
                                                title="Eliminar Habitación"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            <span style={{ color: 'var(--primary-bright)', fontFamily: 'monospace', fontSize: '1.2rem', padding: '0.2rem 0.5rem', border: '1px solid', opacity: 0.8 }}>RM-{index+1}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-main)', fontSize: '0.9rem', opacity: 0.9 }}>
                                        <Box size={16} /> 
                                        <span>{palace.subject || "Unassigned Subject"}</span>
                                    </div>
                                    <div style={{ marginTop: 'auto', borderTop: '1px dashed rgba(124, 58, 237, 0.3)', paddingTop: '1rem' }}>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', margin: 0 }}>
                                            {palace.description ? (palace.description.length > 50 ? palace.description.substring(0, 50) + "..." : palace.description) : "Awaiting architecture... Click to enter 3D"}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
            <RoomCreationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
}
