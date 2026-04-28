// client/src/pages/Home.jsx
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen bg-darker flex flex-col items-center 
                    justify-center p-4 text-center">
      <div className="text-8xl mb-8 animate-bounce">💬</div>
      <h1 className="text-5xl font-bold text-white mb-4">
        Real-Time Chat App
      </h1>
      <p className="text-gray-400 text-xl mb-12 max-w-md">
        Connect with people in real-time. Create rooms, send messages, 
        and see who's online.
      </p>
      <div className="flex gap-4">
        <Link
          to="/login"
          className="bg-primary hover:bg-secondary text-white font-semibold 
                     px-8 py-3 rounded-xl transition text-lg"
        >
          Sign In
        </Link>
        <Link
          to="/register"
          className="bg-light hover:bg-gray-600 text-white font-semibold 
                     px-8 py-3 rounded-xl transition text-lg"
        >
          Register
        </Link>
      </div>

      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
        {[
          { icon: '⚡', title: 'Real-time', desc: 'Instant message delivery with Socket.io' },
          { icon: '🔒', title: 'Secure', desc: 'JWT authentication & encrypted passwords' },
          { icon: '🌐', title: 'Rooms', desc: 'Create and join multiple chat rooms' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="bg-dark border border-light rounded-2xl p-6">
            <div className="text-4xl mb-3">{icon}</div>
            <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
            <p className="text-gray-400 text-sm">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;