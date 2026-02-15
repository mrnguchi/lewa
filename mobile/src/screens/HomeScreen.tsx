import { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { api } from "../services/api";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

export default function HomeScreen() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.get("/students");

        // If backend wraps response as { success, data }
        setStudents(response.data.data ?? response.data);
      } catch (err) {
        setError("Failed to fetch students");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading students...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Students</Text>

      {students.length === 0 ? (
        <Text style={styles.emptyText}>No students found</Text>
      ) : (
        students.map((student, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.name}>{student.full_name}</Text>

            <Text style={styles.meta}>
              Matricule: {student.matricule}
            </Text>

            <Text style={styles.meta}>
              Level: {student.level}
            </Text>

            <Text style={styles.meta}>
              Faculty: {student.faculty}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    flexGrow: 1,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.primary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },

  card: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  name: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  meta: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },

  errorText: {
    color: colors.error,
    fontSize: 16,
  },

  emptyText: {
    textAlign: "center",
    color: colors.textSecondary,
  },
});