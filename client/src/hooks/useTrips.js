import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tripAPI, handleApiError } from "../services/api";
import { useNotifications } from "../contexts/NotificationContext";

// Query keys
const QUERY_KEYS = {
  trips: ["trips"],
  trip: (id) => ["trips", id],
  tripStats: ["trips", "stats"],
  upcomingTrips: ["trips", "upcoming"],
  pastTrips: ["trips", "past"],
  publicTrips: ["trips", "public"],
};

// Get all trips
export const useTrips = (params = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.trips, params],
    queryFn: async () => {
      const response = await tripAPI.getTrips(params);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Get single trip
export const useTrip = (id) => {
  return useQuery({
    queryKey: QUERY_KEYS.trip(id),
    queryFn: async () => {
      const response = await tripAPI.getTripById(id);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get trip stats
export const useTripStats = () => {
  return useQuery({
    queryKey: QUERY_KEYS.tripStats,
    queryFn: async () => {
      const response = await tripAPI.getTripStats();
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Get upcoming trips
export const useUpcomingTrips = (params = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.upcomingTrips, params],
    queryFn: async () => {
      const response = await tripAPI.getUpcomingTrips(params);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get past trips
export const usePastTrips = (params = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.pastTrips, params],
    queryFn: async () => {
      const response = await tripAPI.getPastTrips(params);
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Get public trips
export const usePublicTrips = (params = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.publicTrips, params],
    queryFn: async () => {
      const response = await tripAPI.getPublicTrips(params);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Create trip mutation
export const useCreateTrip = () => {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();

  return useMutation({
    mutationFn: async (tripData) => {
      const response = await tripAPI.createTrip(tripData);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch trips
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trips });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tripStats });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.upcomingTrips });

      notify.trip(`New trip "${data.title}" has been created!`);
    },
    onError: (error) => {
      const { message } = handleApiError(error);
      notify.error(`Failed to create trip: ${message}`);
    },
  });
};

// Update trip mutation
export const useUpdateTrip = () => {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();

  return useMutation({
    mutationFn: async ({ id, ...tripData }) => {
      const response = await tripAPI.updateTrip(id, tripData);
      return response.data;
    },
    onSuccess: (data) => {
      // Update specific trip query
      queryClient.setQueryData(QUERY_KEYS.trip(data.id), data);
      // Invalidate trips list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trips });

      notify.success(`Trip "${data.title}" updated successfully!`);
    },
    onError: (error) => {
      const { message } = handleApiError(error);
      notify.error(`Failed to update trip: ${message}`);
    },
  });
};

// Delete trip mutation
export const useDeleteTrip = () => {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();

  return useMutation({
    mutationFn: async (id) => {
      const response = await tripAPI.deleteTrip(id);
      return response.data;
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.trip(id) });
      // Invalidate trips list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trips });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tripStats });

      notify.success("Trip deleted successfully");
    },
    onError: (error) => {
      const { message } = handleApiError(error);
      notify.error(`Failed to delete trip: ${message}`);
    },
  });
};

// Clone trip mutation
export const useCloneTrip = () => {
  const queryClient = useQueryClient();
  const { notify } = useNotifications();

  return useMutation({
    mutationFn: async (id) => {
      const response = await tripAPI.cloneTrip(id);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate trips list to show new cloned trip
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trips });

      notify.success(`Trip cloned successfully as "${data.title}"`);
    },
    onError: (error) => {
      const { message } = handleApiError(error);
      notify.error(`Failed to clone trip: ${message}`);
    },
  });
};

// Optimistic update helper
export const useOptimisticTripUpdate = () => {
  const queryClient = useQueryClient();

  return (tripId, updater) => {
    queryClient.setQueryData(QUERY_KEYS.trip(tripId), updater);
  };
};
