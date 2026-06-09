import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
import CalendarScreen from "../screens/CalendarScreen";
import UpdatesScreen from "../screens/UpdatesScreen";
import ResourcesScreen from "../screens/ResourcesScreen";
import LewaChatScreen from "../screens/LewaChatScreen";
import LewaAIScreen from "../screens/LewaAIScreen";
import LewaAIChatScreen from "../screens/LewaAIChatScreen";
import SchoolAdminChatScreen from "../screens/SchoolAdminChatScreen";
import EventDetailsScreen from "../screens/EventDetailsScreen";
import ResourceViewerScreen from "../screens/ResourceViewerScreen";
import NewsDetailsScreen from "../screens/NewsDetailsScreen";
import AddNewsScreen from "../screens/AddNewsScreen";
import AddResourceScreen from "../screens/AddResourceScreen";
import ConfirmNumberScreen from "../screens/ConfirmNumberScreen";
import FeeSelectionScreen from "../screens/FeeSelectionScreen";
import PaymentMethodScreen from "../screens/PaymentMethodScreen";
import PaymentSummaryScreen from "../screens/PaymentSummaryScreen";
import PaymentProcessingScreen from "../screens/PaymentProcessingScreen";
import PaymentSuccessfulScreen from "../screens/PaymentSuccessfulScreen";
import ReceiptsScreen from "../screens/ReceiptsScreen";
import ReceiptDetailsScreen from "../screens/ReceiptDetailsScreen";
import SupportDeskScreen from "../screens/SupportDeskScreen";
import RegisterScreen from "../screens/RegisterScreen";
import LoginScreen from "../screens/LoginScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import VerifyOTPScreen from "../screens/VerifyOTPScreen";
import AppBar from "../components/AppBar";
import { View } from "react-native";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main Tabs Navigator with AppBar
function MainTabs() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => <AppBar {...props} />}
        backBehavior="none"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="Lewa News" component={UpdatesScreen} />
        <Tab.Screen name="Resources" component={ResourcesScreen} />
        <Tab.Screen name="LewaChat" component={LewaChatScreen} />
      </Tab.Navigator>
    </View>
  );
}

// Root Stack Navigator
export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Main Tabs (with AppBar) */}
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      {/* Full-screen flows (NO AppBar) */}
      <Stack.Screen
        name="FeeSelection"
        component={FeeSelectionScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      {/* Payment Flow Screens */}
      <Stack.Screen
        name="PaymentMethod"
        component={PaymentMethodScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="ConfirmNumber"
        component={ConfirmNumberScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="PaymentSummary"
        component={PaymentSummaryScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="PaymentProcessing"
        component={PaymentProcessingScreen}
        options={{
          headerShown: false,
          // Keep iOS swipe attempts visible so the screen can explain why it is locked.
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="PaymentSuccessful"
        component={PaymentSuccessfulScreen}
        options={{
          headerShown: false,
          gestureEnabled: false, // Prevent back after success
        }}
      />

      {/* Receipts Screens */}
      <Stack.Screen
        name="Receipts"
        component={ReceiptsScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="ReceiptDetails"
        component={ReceiptDetailsScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      {/* Support Desk Screen */}
      <Stack.Screen
        name="SupportDesk"
        component={SupportDeskScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      {/* Other Screens */}
      <Stack.Screen
        name="EventDetails"
        component={EventDetailsScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="ResourceViewer"
        component={ResourceViewerScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="NewsDetails"
        component={NewsDetailsScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="AddNews"
        component={AddNewsScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="AddResource"
        component={AddResourceScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="LewaAIWelcome"
        component={LewaAIScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="LewaAIChat"
        component={LewaAIChatScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="SchoolAdminChat"
        component={SchoolAdminChatScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
}
