import { useQuery } from '@tanstack/react-query';
import { HorizontalPodAutoscalerList } from 'kubernetes-types/autoscaling/v1';

import { withGlobalError } from '@/react-tools/react-query';
import { EnvironmentId } from '@/react/portainer/environments/types';
import axios from '@/portainer/services/axios';

import type { Application } from '../types';
import { parseKubernetesAxiosError } from '../../axiosError';

import { queryKeys } from './query-keys';

// useApplicationHorizontalPodAutoscalers returns a query for horizontal pod autoscalers that are related to the application
export function useApplicationHorizontalPodAutoscaler(
  environmentId: EnvironmentId,
  namespace: string,
  appName: string,
  app?: Application
) {
  return useQuery(
    queryKeys.applicationHorizontalPodAutoscalers(
      environmentId,
      namespace,
      appName
    ),
    async () => {
      if (!app) {
        return null;
      }

      const horizontalPodAutoscalers =
        await getNamespaceHorizontalPodAutoscalers(environmentId, namespace);
      const matchingHorizontalPodAutoscaler =
        horizontalPodAutoscalers.find((horizontalPodAutoscaler) => {
          const scaleTargetRef = horizontalPodAutoscaler.spec?.scaleTargetRef;
          if (scaleTargetRef) {
            const scaleTargetRefName = scaleTargetRef.name;
            const scaleTargetRefKind = scaleTargetRef.kind;
            // include the horizontal pod autoscaler if the scale target ref name and kind match the application name and kind
            return (
              scaleTargetRefName === app.metadata?.name &&
              scaleTargetRefKind === app.kind
            );
          }
          return false;
        }) || null;
      return matchingHorizontalPodAutoscaler;
    },
    {
      ...withGlobalError(
        `Unable to get horizontal pod autoscaler${
          app ? ` for ${app.metadata?.name}` : ''
        }`
      ),
      enabled: !!app,
    }
  );
}

async function getNamespaceHorizontalPodAutoscalers(
  environmentId: EnvironmentId,
  namespace: string
) {
  try {
    const { data: autoScalarList } =
      await axios.get<HorizontalPodAutoscalerList>(
        `/endpoints/${environmentId}/kubernetes/apis/autoscaling/v1/namespaces/${namespace}/horizontalpodautoscalers`
      );
    return autoScalarList.items;
  } catch (e) {
    throw parseKubernetesAxiosError(
      e,
      'Unable to retrieve horizontal pod autoscalers'
    );
  }
}
