// client/src/components/Notifications/NotificationCenter.jsx
import { useNotification } from '../../context/NotificationContext';

const NotificationCenter = () => {
  const { notifications } = useNotification();

  return (
    <div className="fixed top-4 right-4 space-y-3 z-50">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="bg-dark border border-primary rounded-lg p-4 shadow-lg 
                     max-w-sm animate-slide-in"
        >
          <div className="flex gap-3">
            <span className="text-2xl">{notif.icon}</span>
            <div>
              <p className="font-semibold text-white">{notif.title}</p>
              <p className="text-sm text-gray-400">{notif.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationCenter;