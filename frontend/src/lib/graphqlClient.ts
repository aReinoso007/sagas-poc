import { GraphQLClient } from 'graphql-request'

const url = import.meta.env.VITE_GRAPHQL_URL as string

export const gqlClient = new GraphQLClient(url)

// Queries y mutations tipadas
export const QUERIES = {
  onboardingStatus: `
    query OnboardingStatus($sagaId: String!) {
      onboardingStatus(sagaId: $sagaId) {
        id
        userEmail
        status
        currentStep
        steps {
          id
          stepNumber
          stepName
          status
          errorMessage
          result
        }
      }
    }
  `,
}

export const MUTATIONS = {
  startOnboarding: `
    mutation StartOnboarding($userEmail: String!) {
      startOnboarding(userEmail: $userEmail) {
        id
        userEmail
        status
        currentStep
        steps {
          id
          stepNumber
          stepName
          status
          errorMessage
        }
      }
    }
  `,

  executeStep: `
    mutation ExecuteStep(
      $sagaId: String!
      $stepName: String!
      $forceFail: Boolean
    ) {
      executeStep(
        sagaId: $sagaId
        stepName: $stepName
        forceFail: $forceFail
      ) {
        id
        status
        currentStep
        steps {
          id
          stepNumber
          stepName
          status
          errorMessage
          result
        }
      }
    }
  `,
}