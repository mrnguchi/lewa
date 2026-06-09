/**
 * CalendarScreen Component
 *
 * Calendar tab screen with interactive calendar and events
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';

// Navigation types
type RootStackParamList = {
  EventDetails: {
    event: {
      id: string;
      title: string;
      date: string;
      description: string;
      status: 'upcoming' | 'past';
      time?: string;
    };
    indicatorColor: string;
  };
};

type CalendarScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Mock events data
interface CalendarEvent {
  id: string;
  title: string;
  date: string; // Format: YYYY-MM-DD
  description: string;
  detailedDescription: string;
  status: 'upcoming' | 'past';
}

const mockEvents: CalendarEvent[] = [
  // Past events
  {
    id: '1',
    title: 'Faculty meeting',
    date: '2026-09-02',
    description: 'Monthly faculty meeting to discuss curriculum updates',
    detailedDescription: 'This is a comprehensive monthly faculty meeting where all department heads and senior faculty members gather to discuss important curriculum updates for the upcoming academic year. The meeting will cover topics including new course proposals, curriculum revisions, assessment strategies, and alignment with national education standards. Faculty members are expected to bring their departmental reports and be prepared to present any proposed changes. The meeting will also address student feedback from the previous semester and discuss ways to improve teaching methodologies and learning outcomes. Light refreshments will be provided.',
    status: 'past',
  },
  {
    id: '2',
    title: 'Student orientation',
    date: '2026-09-05',
    description: 'Orientation program for new students',
    detailedDescription: 'Welcome to the University of Buea! This comprehensive orientation program is designed to help new students transition smoothly into university life. The day-long event will include campus tours, introduction to academic departments, meetings with faculty advisors, and information sessions about student services, library resources, and extracurricular activities. Students will receive their student ID cards, learn about the university\'s academic policies, and get acquainted with the Lewa platform for fee payments and academic services. There will also be ice-breaking activities to help students meet their peers and build a supportive community. Parents and guardians are welcome to attend the morning session.',
    status: 'past',
  },
  {
    id: '3',
    title: 'Library workshop',
    date: '2026-09-10',
    description: 'Research skills workshop at the main library',
    detailedDescription: 'Join us for an intensive research skills workshop at the main university library. This workshop is designed for both undergraduate and graduate students who want to enhance their research capabilities. Topics covered will include: effective database searching techniques, proper citation and referencing using APA, MLA, and Chicago styles, plagiarism prevention, critical evaluation of sources, literature review writing, and using reference management software like Zotero and Mendeley. Our experienced librarians will provide hands-on training with the university\'s digital resources, including access to academic journals, e-books, and specialized databases. Participants will receive a certificate of completion and resource materials. Limited seats available, so early registration is encouraged.',
    status: 'past',
  },
  // Upcoming events
  {
    id: '4',
    title: 'Admission board meeting',
    date: '2026-09-11',
    description: 'Undergraduate admission board meeting for the 2025 2026 academic year',
    detailedDescription: 'The Undergraduate Admission Board will convene to review and make final decisions on applications for the 2025-2026 academic year. This critical meeting brings together representatives from all faculties, the admissions office, and senior university administrators to evaluate applicant credentials, discuss admission standards, and determine the incoming class composition. The board will review applications holistically, considering academic performance, entrance examination scores, extracurricular achievements, and personal statements. Special attention will be given to ensuring diversity and maintaining the university\'s academic standards. Decisions made during this meeting will be communicated to applicants within two weeks. The meeting is closed to the public to maintain confidentiality of applicant information.',
    status: 'upcoming',
  },
  {
    id: '5',
    title: 'Admission board meeting',
    date: '2026-09-16',
    description: 'Graduate admission board meeting for the 2025 2026 academic year',
    detailedDescription: 'The Graduate Admission Board meeting will focus on reviewing applications for Master\'s and PhD programs for the 2025-2026 academic year. This specialized committee includes graduate program directors, department chairs, and the Dean of Graduate Studies. The board will carefully evaluate each applicant\'s academic background, research proposals, letters of recommendation, and potential for contributing to their chosen field of study. For PhD applicants, the availability of suitable supervisors and research funding will also be considered. The meeting will address program-specific requirements and ensure that admitted students meet the high standards expected of graduate scholars at the University of Buea. Conditional offers may be made pending final transcripts or English proficiency test results.',
    status: 'upcoming',
  },
  {
    id: '6',
    title: 'Registration deadline',
    date: '2026-09-24',
    description: 'Last day for course registration',
    detailedDescription: 'This is the final deadline for all students to complete their course registration for the fall semester. After this date, late registration will incur additional fees and may be subject to approval by the Dean of Students. Students must ensure they have: paid their tuition fees through the Lewa platform, met with their academic advisors to confirm course selections, checked for any prerequisite requirements, and verified that their course load meets the minimum and maximum credit hour requirements for their program. Registration is done online through the student portal. Students experiencing technical difficulties should contact the IT helpdesk immediately. Failure to register by this deadline may result in being dropped from courses and could affect your academic standing and financial aid eligibility.',
    status: 'upcoming',
  },
  {
    id: '7',
    title: 'Semester begins',
    date: '2026-09-29',
    description: 'First day of the fall semester',
    detailedDescription: 'Welcome to the start of the fall semester! Classes officially begin today, and all students are expected to attend their scheduled courses. This marks the beginning of an exciting academic journey filled with learning opportunities, intellectual growth, and personal development. Students should arrive at their classrooms at least 10 minutes early, bring all necessary materials including notebooks and textbooks, and be prepared to engage actively in discussions. Professors will distribute course syllabi outlining learning objectives, assessment methods, and important dates. The first week is crucial for understanding course expectations and building rapport with instructors and classmates. The university bookstore will have extended hours this week for last-minute textbook purchases. Student support services, including tutoring centers and counseling services, are available from day one. Make this semester count!',
    status: 'upcoming',
  },
];

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarScreen: React.FC = () => {
  const navigation = useNavigation<CalendarScreenNavigationProp>();
  const isAndroid = Platform.OS === 'android';
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleEventsCount, setVisibleEventsCount] = useState(3);

  // Available years for school year (e.g., 2025/2026)
  const availableYears = [2025, 2026];

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  // Get days in month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 6 = Saturday)
  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  // Generate calendar days - fill complete weeks
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    // Fill remaining cells to complete the last week (7 days per week)
    const remainingCells = 7 - (days.length % 7);
    if (remainingCells < 7) {
      for (let i = 0; i < remainingCells; i++) {
        days.push(null);
      }
    }

    return days;
  };

  // Check if day has events
  const dayHasEvents = (day: number | null) => {
    if (!day) return false;
    const dateString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return mockEvents.some(event => event.date === dateString);
  };

  // Get event indicator color for a day
  const getEventIndicatorColor = (day: number | null) => {
    if (!day || !dayHasEvents(day)) return null;

    const dateString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const eventIndex = mockEvents.findIndex(event => event.date === dateString);

    const indicatorColors = [colors.primary, colors.gold, '#1F3657'];
    return indicatorColors[eventIndex % 3];
  };

  // Get upcoming events for the month
  const getUpcomingEventsForMonth = () => {
    const monthEvents = mockEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getMonth() === selectedMonth && eventDate.getFullYear() === selectedYear;
    });

    // Sort by date
    return monthEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const handleMonthSelect = (monthIndex: number) => {
    setSelectedMonth(monthIndex);
    setShowMonthDropdown(false);
    setVisibleEventsCount(3); // Reset to show 3 events when month changes
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setShowYearDropdown(false);
    setVisibleEventsCount(3); // Reset to show 3 events when year changes
  };

  const handleSearchToggle = () => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      setSearchQuery('');
    }
  };

  const handleViewMore = () => {
    setVisibleEventsCount(prev => prev + 3);
  };

  const handleEventPress = (event: CalendarEvent) => {
    const eventDate = new Date(event.date);
    const eventDay = eventDate.getDate();
    const indicatorColor = getEventIndicatorColor(eventDay);

    navigation.navigate('EventDetails', {
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
        description: event.detailedDescription,
        status: event.status,
        time: '10:00 am to 02:00 pm', // You can add this to your event data if needed
      },
      indicatorColor: indicatorColor || colors.primary,
    });
  };

  const calendarDays = generateCalendarDays();
  const upcomingEvents = getUpcomingEventsForMonth();
  const visibleEvents = upcomingEvents.slice(0, visibleEventsCount);
  const hasMoreEvents = upcomingEvents.length > visibleEventsCount;

  return (
    <View style={styles.container}>

      {/* Header */}
      <AppHeader />

    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, isAndroid && styles.scrollContentAndroid]}
    >
        {/* Header */}
        <View style={[styles.header, isAndroid && styles.headerAndroid]}>
          {/* Month/Year Controls */}
          {!showSearch ? (
            <View style={styles.controlsRow}>
              {/* Month Dropdown */}
              <TouchableOpacity
                style={[styles.monthButton, isAndroid && styles.controlButtonAndroid]}
                onPress={() => setShowMonthDropdown(!showMonthDropdown)}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={[styles.monthButtonText, isAndroid && styles.controlTextAndroid]}>
                  {months[selectedMonth]}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textPrimary} />
              </TouchableOpacity>

              {/* Spacer to push items to the right */}
              <View style={{ flex: 1 }} />

              {/* Search Button */}
              <TouchableOpacity
                style={[styles.searchButton, isAndroid && styles.searchButtonAndroid]}
                onPress={handleSearchToggle}
              >
                <Ionicons name="search" size={20} color={colors.textBody} />
              </TouchableOpacity>

              {/* Year Dropdown Button */}
              <TouchableOpacity
                style={[styles.yearButton, isAndroid && styles.controlButtonAndroid]}
                onPress={() => setShowYearDropdown(!showYearDropdown)}
              >
                <Text style={[styles.yearText, isAndroid && styles.controlTextAndroid]}>
                  {selectedYear}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.searchRow, isAndroid && styles.searchRowAndroid]}>
              <View
                style={[
                  styles.searchInputContainer,
                  isAndroid && styles.searchInputContainerAndroid,
                ]}
              >
                <Ionicons
                  name="search"
                  size={isAndroid ? 17 : 20}
                  color={colors.textBody}
                />
                <TextInput
                  style={[styles.searchInput, isAndroid && styles.searchInputAndroid]}
                  placeholder="Search events..."
                  placeholderTextColor={colors.textBody}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
              </View>
              <TouchableOpacity
                style={isAndroid && styles.searchCloseButtonAndroid}
                onPress={handleSearchToggle}
              >
                <Ionicons
                  name="close"
                  size={isAndroid ? 21 : 24}
                  color={colors.textBody}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Month Dropdown Modal */}
        <Modal
          visible={showMonthDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMonthDropdown(false)}
        >
          <TouchableOpacity
            style={[styles.modalOverlay, isAndroid && styles.modalOverlayAndroid]}
            activeOpacity={1}
            onPress={() => setShowMonthDropdown(false)}
          >
            <View
              style={[
                styles.dropdownContainer,
                isAndroid && styles.dropdownContainerAndroid,
              ]}
            >
              <ScrollView style={styles.dropdownScroll}>
                {months.map((month, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dropdownItem,
                      isAndroid && styles.dropdownItemAndroid,
                      selectedMonth === index && styles.dropdownItemSelected,
                    ]}
                    onPress={() => handleMonthSelect(index)}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        isAndroid && styles.dropdownItemTextAndroid,
                        selectedMonth === index && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Year Dropdown Modal */}
        <Modal
          visible={showYearDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowYearDropdown(false)}
        >
          <TouchableOpacity
            style={[styles.modalOverlay, isAndroid && styles.modalOverlayAndroid]}
            activeOpacity={1}
            onPress={() => setShowYearDropdown(false)}
          >
            <View
              style={[
                styles.dropdownContainer,
                isAndroid && styles.dropdownContainerAndroid,
              ]}
            >
              <ScrollView style={styles.dropdownScroll}>
                {availableYears.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.dropdownItem,
                      isAndroid && styles.dropdownItemAndroid,
                      selectedYear === year && styles.dropdownItemSelected,
                    ]}
                    onPress={() => handleYearSelect(year)}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        isAndroid && styles.dropdownItemTextAndroid,
                        selectedYear === year && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Calendar Card */}
        <View style={[styles.calendarCard, isAndroid && styles.calendarCardAndroid]}>
          {/* Calendar Header */}
          <View style={styles.calendarHeader}>
            <View
              style={[
                styles.calendarIconContainer,
                isAndroid && styles.calendarIconContainerAndroid,
              ]}
            >
              <Image
                source={require('../../assets/UB-logo-1.jpg')}
                style={styles.ubLogo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.calendarHeaderText}>
              <Text style={[styles.calendarTitle, isAndroid && styles.calendarTitleAndroid]}>
                UB Calendar
              </Text>
              <Text style={styles.calendarSubtitle}>
                Stay up to date with UB calendar through Lewa
              </Text>
            </View>
          </View>

          {/* Days of Week */}
          <View style={styles.daysOfWeekRow}>
            {daysOfWeek.map((day, index) => (
              <View key={index} style={styles.dayOfWeekCell}>
                <Text style={[styles.dayOfWeekText, isAndroid && styles.dayOfWeekTextAndroid]}>
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => {
              const indicatorColor = getEventIndicatorColor(day);
              return (
                <View key={index} style={[styles.dayCell, isAndroid && styles.dayCellAndroid]}>
                  {day && (
                    <Text
                      style={[
                        styles.dayText,
                        isAndroid && styles.dayTextAndroid,
                        dayHasEvents(day) && styles.dayTextWithEvent,
                        indicatorColor && { color: indicatorColor },
                      ]}
                    >
                      {day}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Events List */}
        <View style={[styles.eventsSection, isAndroid && styles.eventsSectionAndroid]}>
          {visibleEvents.length > 0 ? (
            <>
              {visibleEvents.map((event) => {
                const eventDate = new Date(event.date);
                const eventDay = eventDate.getDate();
                const formattedDate = `${eventDay} ${months[eventDate.getMonth()]} ${eventDate.getFullYear()}`;
                const indicatorColor = getEventIndicatorColor(eventDay);

                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventCard, isAndroid && styles.eventCardAndroid]}
                    onPress={() => handleEventPress(event)}
                  >
                    {/* Top Row: Day number and Title/Date stacked */}
                    <View style={styles.eventTopRow}>
                      <View style={[
                        styles.eventDayBadge,
                        isAndroid && styles.eventDayBadgeAndroid,
                        indicatorColor && { backgroundColor: indicatorColor }
                      ]}>
                        <Text
                          style={[
                            styles.eventDayNumber,
                            isAndroid && styles.eventDayNumberAndroid,
                          ]}
                        >
                          {eventDay}
                        </Text>
                      </View>
                      <View style={styles.eventTitleContainer}>
                        <Text
                          style={[styles.eventTitle, isAndroid && styles.eventTitleAndroid]}
                          numberOfLines={1}
                        >
                          {event.title}
                        </Text>
                        <Text style={styles.eventDateText}>{formattedDate}</Text>
                      </View>
                    </View>

                    {/* Description Row */}
                    <View style={styles.eventDescriptionRow}>
                      <View style={styles.eventDescriptionLine} />
                      <Text
                        style={[
                          styles.eventDescription,
                          isAndroid && styles.eventDescriptionAndroid,
                        ]}
                        numberOfLines={2}
                      >
                        {event.description}
                      </Text>
                    </View>

                    {/* Status Badge at Bottom Right */}
                    <View style={styles.eventStatusBadge}>
                      <Text style={styles.eventStatusText}>{event.status}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {hasMoreEvents && (
                <TouchableOpacity style={styles.viewMoreButton} onPress={handleViewMore}>
                  <Text style={styles.viewMoreText}>View more</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.noEventsContainer}>
              <Text style={styles.noEventsText}>No events</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  scrollContentAndroid: {
    paddingBottom: 118,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: colors.background,
  },
  // I keep the Android calendar controls compact so the full row stays balanced.
  headerAndroid: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
  },
  headerTop: {
    paddingHorizontal: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  translationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  translationIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    tintColor: colors.primary,
  },
  translationText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  profileButton: {
    width: 48,
    height: 48,
  },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
  },
  monthButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
  },
  controlButtonAndroid: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 6,
  },
  controlTextAndroid: {
    fontSize: 14,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonAndroid: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  yearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
  },
  yearText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textPrimary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchRowAndroid: {
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
  },
  searchInputContainerAndroid: {
    height: 46,
    paddingHorizontal: 14,
    paddingVertical: 0,
    borderRadius: 23,
    gap: 7,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: colors.textPrimary,
  },
  searchInputAndroid: {
    height: 46,
    paddingVertical: 0,
    fontSize: 12.5,
  },
  searchCloseButtonAndroid: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 200,
    paddingHorizontal: 20,
  },
  modalOverlayAndroid: {
    paddingTop: 150,
    paddingHorizontal: 16,
  },
  dropdownContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownContainerAndroid: {
    maxHeight: 260,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.025,
    shadowRadius: 4,
    elevation: 1,
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  dropdownItem: {
    paddingVertical: 16,
    paddingHorizontal:10,
    borderBottomWidth: 1,
    // alignSelf: 'center',
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemAndroid: {
    paddingVertical: 12,
  },
  dropdownItemSelected: {
    // backgroundColor: colors.primaryLight,
  },
  dropdownItemText: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: colors.textPrimary,
    alignSelf: 'center',
  },
  dropdownItemTextAndroid: {
    fontSize: 14,
  },
  dropdownItemTextSelected: {
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  // Calendar Card Styles
  calendarCard: {
    backgroundColor: colors.white,
    marginHorizontal: 18,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.05,
    // shadowRadius: 8,
    // elevation: 2,
    borderWidth: 0.5,
    borderColor: colors.border1,
  },
  calendarCardAndroid: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    padding: 14,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  calendarIconContainer: {
    width: 66,
    height: 66,
    borderRadius: 12,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  calendarIconContainerAndroid: {
    width: 54,
    height: 54,
    borderRadius: 10,
    padding: 6,
  },
  ubLogo: {
    width: '100%',
    height: '100%',
  },
  calendarHeaderText: {
    flex: 1,
  },
  calendarTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  calendarTitleAndroid: {
    fontSize: 16,
  },
  calendarSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    lineHeight: 16,
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dayOfWeekCell: {
    width: '14.28%', // Match dayCell width for proper alignment
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayOfWeekText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  dayOfWeekTextAndroid: {
    fontSize: 12,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%', // 100/7 for 7 days per week
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayCellAndroid: {
    paddingVertical: 5,
  },
  dayText: {
    fontSize: 18,
    fontFamily: 'Poppins_500SemiBold',
    color: colors.textPrimary,
  },
  dayTextAndroid: {
    fontSize: 14,
  },
  dayTextWithEvent: {
    fontFamily: 'Poppins_600SemiBold',
  },
  // Events Section Styles
  eventsSection: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  eventsSectionAndroid: {
    paddingHorizontal: 16,
    paddingTop: 22,
  },
  eventCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventCardAndroid: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  eventDayBadge: {
    width: 50,
    height: 55,
    borderRadius: 8,
    backgroundColor: colors.primary, // Default color, will be overridden by indicator color
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventDayBadgeAndroid: {
    width: 44,
    height: 48,
  },
  eventDayNumber: {
    fontSize: 25,
    fontFamily: 'Poppins_700Bold',
    color: colors.white,
  },
  eventDayNumberAndroid: {
    fontSize: 21,
  },
  eventTitleContainer: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },
  eventTitleAndroid: {
    fontSize: 14,
  },
  eventDateText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
  },
  eventDescriptionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    marginTop:12,
  },
  eventDescriptionLine: {
    width: 3,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  eventDescription: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: colors.textBody,
    lineHeight: 20,
  },
  eventDescriptionAndroid: {
    fontSize: 12,
    lineHeight: 18,
  },
  eventStatusBadge: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventStatusText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  noEventsContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  noEventsText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textBody,
  },
  viewMoreButton: {
    
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.05,
    // shadowRadius: 8,
    // elevation: 2,
  },
  viewMoreText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
});

export default CalendarScreen;
