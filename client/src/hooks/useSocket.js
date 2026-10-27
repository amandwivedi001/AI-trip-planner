import { useEffect, useState } from "react";
import { useNotifications } from "../contexts/NotificationContext";

export const useSocket = () => {
  const { socket, isConnected, joinTripRoom, leaveTripRoom, sendTripUpdate } =
    useNotifications();

  return {
    socket,
    isConnected,
    joinTripRoom,
    leaveTripRoom,
    sendTripUpdate,
  };
};
