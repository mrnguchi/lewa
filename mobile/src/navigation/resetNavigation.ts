import { CommonActions, NavigationProp, ParamListBase } from '@react-navigation/native';

/**
 * Clears completed flows and makes the selected main tab the new navigation root.
 */
export const resetToMainTab = (
  navigation: NavigationProp<ParamListBase>,
  screen: string = 'Home'
) => {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'MainTabs',
          params: { screen },
        },
      ],
    })
  );
};

/**
 * Restarts fee payment without leaving an old processing screen in the stack.
 */
export const resetToFeeSelection = (navigation: NavigationProp<ParamListBase>) => {
  navigation.dispatch(
    CommonActions.reset({
      index: 1,
      routes: [
        {
          name: 'MainTabs',
          params: { screen: 'Home' },
        },
        {
          name: 'FeeSelection',
        },
      ],
    })
  );
};
