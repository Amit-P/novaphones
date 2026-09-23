import { Bell, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications, type AppNotification } from '@/contexts/NotificationContext';
import { products } from '@/data/products';
import { cn } from '@/lib/utils';

const NotificationRow = ({
  notification,
  onRead,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
}) => {
  const productStillExists = products.some((p) => p.id === notification.productId);
  const rowClassName = cn(
    'block w-full text-left px-3 py-2.5 rounded-md transition-colors',
    notification.read ? 'text-muted-foreground' : 'bg-accent font-medium text-foreground'
  );
  const content = (
    <>
      <p className="text-sm leading-snug">{notification.message}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
      </p>
    </>
  );

  if (productStillExists) {
    return (
      <Link to={`/product/${notification.productId}`} onClick={() => onRead(notification.id)} className={rowClassName}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => onRead(notification.id)} className={rowClassName}>
      {content}
    </button>
  );
};

export const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Mark all as read
            </Button>
          )}
        </div>
        <Separator />
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 px-3">
            You're all caught up — no notifications yet.
          </p>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="p-1.5 space-y-0.5">
              {notifications.map((n) => (
                <NotificationRow key={n.id} notification={n} onRead={markAsRead} />
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
};
