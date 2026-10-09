"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type CurrentUser = {
  full_name: string;
  email: string;
  can_access_all_locations: boolean;
  roles: {
    code: string;
    name: string;
  }[];
  locations: {
    id: string;
    name: string;
    location_code: string;
  }[];
};

type StaffNotification = {
  id: string;
  source_type: string;
  source_id: string | null;
  event_type: string;
  severity:
    | "info"
    | "success"
    | "warning"
    | "critical";
  title: string;
  message_body: string;
  action_url: string | null;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
};

type NotificationResponse = {
  unread_count: number;
  notifications: StaffNotification[];
};

function notificationColour(
  severity: StaffNotification["severity"]
) {
  if (severity === "success") {
    return {
      background: "#ecfdf5",
      border: "#a7f3d0",
      accent: "#047857",
    };
  }

  if (severity === "warning") {
    return {
      background: "#fffbeb",
      border: "#fde68a",
      accent: "#b45309",
    };
  }

  if (severity === "critical") {
    return {
      background: "#fef2f2",
      border: "#fecaca",
      accent: "#b91c1c",
    };
  }

  return {
    background: "#eff6ff",
    border: "#bfdbfe",
    accent: "#1d4ed8",
  };
}

export default function UserSessionBar() {
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [firebaseUser, setFirebaseUser] =
    useState<User | null>(null);

  const [notifications, setNotifications] =
    useState<StaffNotification[]>([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [notificationsLoading, setNotificationsLoading] =
    useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);

  async function authenticatedFetch(
    user: User,
    path: string,
    options: RequestInit = {}
  ) {
    const token = await user.getIdToken();

    return fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
      cache: "no-store",
    });
  }

  async function loadNotifications(
    user: User,
    showLoading = false
  ) {
    try {
      if (showLoading) {
        setNotificationsLoading(true);
      }

      const response = await authenticatedFetch(
        user,
        "/api/staff-notifications?limit=30"
      );

      if (response.status === 403) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      if (!response.ok) {
        throw new Error(
          "Não foi possível carregar as notificações."
        );
      }

      const data =
        (await response.json()) as NotificationResponse;

      setNotifications(data.notifications || []);
      setUnreadCount(Number(data.unread_count || 0));
    } catch (error) {
      console.error(
        "Erro ao carregar notificações:",
        error
      );
    } finally {
      if (showLoading) {
        setNotificationsLoading(false);
      }
    }
  }

  useEffect(() => {
    let intervalId:
      | ReturnType<typeof setInterval>
      | undefined;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        setFirebaseUser(user);

        if (!user) {
          setCurrentUser(null);
          setNotifications([]);
          setUnreadCount(0);

          if (intervalId) {
            clearInterval(intervalId);
          }

          return;
        }

        try {
          const response = await authenticatedFetch(
            user,
            "/api/me"
          );

          if (response.ok) {
            setCurrentUser(await response.json());
          }

          await loadNotifications(user);
        } catch (error) {
          console.error(
            "Erro ao carregar utilizador:",
            error
          );
        }

        if (intervalId) {
          clearInterval(intervalId);
        }

        intervalId = setInterval(
          () => loadNotifications(user),
          60000
        );
      }
    );

    return () => {
      unsubscribe();

      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  useEffect(() => {
    function closePanel(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(
          event.target as Node
        )
      ) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      closePanel
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        closePanel
      );
    };
  }, []);

  async function markAsRead(
    notification: StaffNotification
  ) {
    if (!firebaseUser) return;

    if (!notification.is_read) {
      try {
        const response = await authenticatedFetch(
          firebaseUser,
          `/api/staff-notifications/${notification.id}/read`,
          {
            method: "POST",
          }
        );

        if (response.ok) {
          setNotifications((current) =>
            current.map((item) =>
              item.id === notification.id
                ? {
                    ...item,
                    is_read: true,
                    read_at:
                      new Date().toISOString(),
                  }
                : item
            )
          );

          setUnreadCount((current) =>
            Math.max(0, current - 1)
          );
        }
      } catch (error) {
        console.error(
          "Erro ao marcar notificação:",
          error
        );
      }
    }

    if (notification.action_url) {
      window.location.href =
        notification.action_url;
    }
  }

  async function markAllAsRead() {
    if (!firebaseUser || unreadCount === 0) {
      return;
    }

    try {
      const response = await authenticatedFetch(
        firebaseUser,
        "/api/staff-notifications/read-all",
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Não foi possível marcar as notificações."
        );
      }

      const readAt = new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
          read_at:
            notification.read_at || readAt,
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error(
        "Erro ao marcar todas como lidas:",
        error
      );
    }
  }

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }

  if (!currentUser) return null;

  const initials = currentUser.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();

  const roleNames =
    currentUser.roles
      .map((role) => role.name)
      .join(", ") || "Utilizador";

  const locationNames =
    currentUser.can_access_all_locations
      ? "Todas as localizações"
      : currentUser.locations
          .map((location) => location.name)
          .join(", ") ||
        "Sem localização atribuída";

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "14px",
        minHeight: "58px",
        padding: "8px 24px",
        background: "#ffffff",
        borderBottom: "1px solid #dbe2ea",
        boxShadow:
          "0 2px 8px rgba(15, 23, 42, 0.06)",
        color: "#0f172a",
      }}
    >
      <div
        ref={panelRef}
        style={{
          position: "relative",
        }}
      >
        <button
          type="button"
          aria-label="Notificações"
          title="Notificações"
          onClick={() => {
            const nextOpen =
              !notificationsOpen;

            setNotificationsOpen(nextOpen);

            if (nextOpen && firebaseUser) {
              void loadNotifications(
                firebaseUser,
                true
              );
            }
          }}
          style={{
            position: "relative",
            width: "42px",
            height: "42px",
            display: "grid",
            placeItems: "center",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            background: notificationsOpen
              ? "#f1f5f9"
              : "#ffffff",
            color: "#0f172a",
            cursor: "pointer",
          }}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>

          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-6px",
                right: "-6px",
                minWidth: "21px",
                height: "21px",
                padding: "0 5px",
                display: "grid",
                placeItems: "center",
                borderRadius: "999px",
                border: "2px solid #ffffff",
                background: "#dc2626",
                color: "#ffffff",
                fontSize: "10px",
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              {unreadCount > 99
                ? "99+"
                : unreadCount}
            </span>
          )}
        </button>

        {notificationsOpen && (
          <div
            className="pen-notification-panel"
            style={{
              maxHeight: "70vh",
              overflow: "hidden",
              border: "1px solid #cbd5e1",
              borderRadius: "16px",
              background: "#ffffff",
              boxShadow:
                "0 20px 45px rgba(15, 23, 42, 0.22)",
              color: "#0f172a",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "16px",
                borderBottom:
                  "1px solid #e2e8f0",
                background: "#ffffff",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  Notificações
                </div>

                <div
                  style={{
                    marginTop: "2px",
                    fontSize: "12px",
                    color: "#475569",
                  }}
                >
                  {unreadCount === 0
                    ? "Tudo em dia"
                    : `${unreadCount} por ler`}
                </div>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  style={{
                    padding: 0,
                    border: 0,
                    background: "transparent",
                    color: "#1d4ed8",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            <div
              style={{
                maxHeight:
                  "calc(70vh - 74px)",
                overflowY: "auto",
                padding: "10px",
                background: "#f8fafc",
              }}
            >
              {notificationsLoading &&
                notifications.length === 0 && (
                  <div
                    style={{
                      padding: "28px 16px",
                      textAlign: "center",
                      color: "#475569",
                      fontSize: "14px",
                    }}
                  >
                    A carregar notificações...
                  </div>
                )}

              {!notificationsLoading &&
                notifications.length === 0 && (
                  <div
                    style={{
                      padding: "28px 16px",
                      textAlign: "center",
                      color: "#475569",
                      fontSize: "14px",
                    }}
                  >
                    Ainda não existem notificações.
                  </div>
                )}

              {notifications.map(
                (notification) => {
                  const colours =
                    notificationColour(
                      notification.severity
                    );

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() =>
                        void markAsRead(
                          notification
                        )
                      }
                      style={{
                        width: "100%",
                        display: "block",
                        marginBottom: "8px",
                        padding: "14px",
                        textAlign: "left",
                        border: `1px solid ${colours.border}`,
                        borderLeft: `4px solid ${colours.accent}`,
                        borderRadius: "12px",
                        background:
                          notification.is_read
                            ? "#ffffff"
                            : colours.background,
                        color: "#0f172a",
                        cursor:
                          notification.action_url
                            ? "pointer"
                            : "default",
                        opacity:
                          notification.is_read
                            ? 0.78
                            : 1,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: "10px",
                        }}
                      >
                        <strong
                          style={{
                            color: "#0f172a",
                            fontSize: "14px",
                          }}
                        >
                          {notification.title}
                        </strong>

                        {!notification.is_read && (
                          <span
                            aria-label="Por ler"
                            style={{
                              flex: "0 0 auto",
                              width: "8px",
                              height: "8px",
                              marginTop: "5px",
                              borderRadius: "50%",
                              background:
                                colours.accent,
                            }}
                          />
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: "5px",
                          color: "#334155",
                          fontSize: "13px",
                          lineHeight: 1.45,
                        }}
                      >
                        {notification.message_body}
                      </div>

                      <div
                        style={{
                          marginTop: "8px",
                          color: "#64748b",
                          fontSize: "11px",
                        }}
                      >
                        {new Date(
                          notification.created_at
                        ).toLocaleString("pt-PT")}
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        )}
      </div>

      <div
        aria-label="Perfil do utilizador"
        style={{
          width: "38px",
          height: "38px",
          flex: "0 0 auto",
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: "#10213d",
          color: "#ffffff",
          fontWeight: 700,
          fontSize: "13px",
        }}
      >
        {initials}
      </div>

      <div
        style={{
          lineHeight: 1.25,
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          {currentUser.full_name}
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "#475569",
          }}
        >
          {roleNames} · {locationNames}
        </div>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        style={{
          marginLeft: "8px",
          padding: "9px 14px",
          border: "1px solid #dc2626",
          borderRadius: "8px",
          background: "#ffffff",
          color: "#dc2626",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Terminar sessão
      </button>
    </div>
  );
}
