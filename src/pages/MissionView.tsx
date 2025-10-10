import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function MissionView() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/team-missions', { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center">
        <div className="relative mb-4 mx-auto w-16 h-16">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-700"></div>
          <div className="absolute top-0 left-0 animate-spin rounded-full h-16 w-16 border-t-4 border-teal-500"></div>
        </div>
        <p className="text-white font-semibold">Redirection...</p>
      </div>
    </div>
  );
}
