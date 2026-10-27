import { useMutation, useQuery } from "@tanstack/react-query";
import { aiAPI, handleApiError } from "../services/api";
import { useNotifications } from "../contexts/NotificationContext";

// AI-powered trip planning hooks
export const useGenerateItinerary = () => {
  const { notify, setLoading } = useNotifications();

  return useMutation({
    mutationFn: async (itineraryData) => {
      setLoading(
        "generateItinerary",
        true,
        "Generating your perfect itinerary..."
      );
      const response = await aiAPI.generateItinerary(itineraryData);
      return response.data;
    },
    onSuccess: (data) => {
      setLoading("generateItinerary", false);
      notify.success("🎉 Your AI-generated itinerary is ready!");
    },
    onError: (error) => {
      setLoading("generateItinerary", false);
      const { message } = handleApiError(error);
      notify.error(`Failed to generate itinerary: ${message}`);
    },
    onSettled: () => {
      setLoading("generateItinerary", false);
    },
  });
};

export const useOptimizeItinerary = () => {
  const { notify, setLoading } = useNotifications();

  return useMutation({
    mutationFn: async (optimizationData) => {
      setLoading("optimizeItinerary", true, "Optimizing your itinerary...");
      const response = await aiAPI.optimizeItinerary(optimizationData);
      return response.data;
    },
    onSuccess: (data) => {
      setLoading("optimizeItinerary", false);
      notify.success("✨ Itinerary optimized for the best experience!");
    },
    onError: (error) => {
      setLoading("optimizeItinerary", false);
      const { message } = handleApiError(error);
      notify.error(`Failed to optimize itinerary: ${message}`);
    },
    onSettled: () => {
      setLoading("optimizeItinerary", false);
    },
  });
};

export const useTravelSuggestions = () => {
  const { notify, setLoading } = useNotifications();

  return useMutation({
    mutationFn: async (preferencesData) => {
      setLoading(
        "travelSuggestions",
        true,
        "Finding personalized recommendations..."
      );
      const response = await aiAPI.getTravelSuggestions(preferencesData);
      return response.data;
    },
    onSuccess: (data) => {
      setLoading("travelSuggestions", false);
      notify.info("🌟 Found amazing destinations just for you!");
    },
    onError: (error) => {
      setLoading("travelSuggestions", false);
      const { message } = handleApiError(error);
      notify.error(`Failed to get travel suggestions: ${message}`);
    },
    onSettled: () => {
      setLoading("travelSuggestions", false);
    },
  });
};

export const useDestinationInsights = (destination) => {
  const { notify } = useNotifications();

  return useQuery({
    queryKey: ["destination-insights", destination],
    queryFn: async () => {
      const response = await aiAPI.getDestinationInsights({ destination });
      return response.data;
    },
    enabled: !!destination,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    onError: (error) => {
      const { message } = handleApiError(error);
      notify.error(`Failed to get destination insights: ${message}`);
    },
  });
};

// Helper hook for AI loading states
export const useAILoadingStates = () => {
  const { isLoading, getLoadingMessage } = useNotifications();

  return {
    isGeneratingItinerary: isLoading("generateItinerary"),
    isOptimizingItinerary: isLoading("optimizeItinerary"),
    isGettingSuggestions: isLoading("travelSuggestions"),

    getGeneratingMessage: () => getLoadingMessage("generateItinerary"),
    getOptimizingMessage: () => getLoadingMessage("optimizeItinerary"),
    getSuggestionsMessage: () => getLoadingMessage("travelSuggestions"),

    isAnyAITaskRunning:
      isLoading("generateItinerary") ||
      isLoading("optimizeItinerary") ||
      isLoading("travelSuggestions"),
  };
};
