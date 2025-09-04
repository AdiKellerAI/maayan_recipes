# מערכת התראות על שינויים לא שמורים

## סקירה כללית

המערכת מונעת מהמשתמש לאבד שינויים לא שמורים בעת עריכת מתכונים או הוספת מתכונים חדשים. המערכת מזהה מתי המשתמש מנסה לעזוב את הדף עם שינויים לא שמורים ומציגה התראה.

## רכיבי המערכת

### 1. UnsavedChangesContext
**מיקום:** `src/contexts/UnsavedChangesContext.tsx`

Context גלובלי שמנהל את מצב השינויים הלא שמורים בכל האפליקציה.

**פונקציות:**
- `hasUnsavedChanges`: מצב השינויים הלא שמורים
- `setHasUnsavedChanges`: עדכון מצב השינויים
- `navigateWithUnsavedCheck`: ניווט עם בדיקת שינויים לא שמורים
- `registerUnsavedChanges`: רישום שינויים לא שמורים מדפים ספציפיים
- `registerSaveFunction`: רישום פונקציית שמירה מדפים ספציפיים

### 2. useUnsavedChanges Hook
**מיקום:** `src/hooks/useUnsavedChanges.ts`

Hook מקומי שמטפל בהתראות על שינויים לא שמורים בדף ספציפי.

**פונקציות:**
- `navigateWithUnsavedCheck`: ניווט עם בדיקת שינויים
- `handleNavigation`: טיפול בניווט עם התראה

### 3. דפי עריכה והוספה
**מיקומים:** 
- `src/pages/EditRecipePage.tsx`
- `src/pages/AddRecipePage.tsx`

דפים אלה משתמשים במערכת כדי לעקוב אחר שינויים בטופס ולהציג התראות.

### 4. Header Navigation
**מיקום:** `src/components/Layout/Header.tsx`

הכותר משתמש ב-context הגלובלי כדי לבדוק שינויים לא שמורים לפני ניווט.

## איך זה עובד

### 1. זיהוי שינויים
כאשר המשתמש משנה משהו בטופס (שם מתכון, קטגוריה, רכיבים, הוראות, תמונות), המערכת מעדכנת את `hasUnsavedChanges` ל-`true`.

### 2. התראה על ניווט
כאשר המשתמש מנסה לעזוב את הדף (לחיצה על כפתור ניווט, חזרה אחורה, סגירת דפדפן), המערכת בודקת אם יש שינויים לא שמורים.

### 3. אפשרויות המשתמש
אם יש שינויים לא שמורים, המערכת מציגה התראה עם שתי אפשרויות:
- **שמירה**: המערכת קוראת לפונקציית השמירה הרשומה, שומרת את השינויים ואז מנווטת
- **ביטול**: המערכת מבטלת את השינויים ומנווטת

### 4. טיפול בסגירת דפדפן
המערכת משתמשת ב-`beforeunload` event כדי להתריע על סגירת דפדפן עם שינויים לא שמורים.

## שימוש במערכת

### בדף עריכה/הוספה חדש:

```typescript
// הוספת מעקב אחר שינויים
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

// רישום שינויים ב-context הגלובלי
const { registerUnsavedChanges, registerSaveFunction } = useUnsavedChangesContext();
useEffect(() => {
  registerUnsavedChanges(hasUnsavedChanges);
}, [hasUnsavedChanges, registerUnsavedChanges]);

// רישום פונקציית שמירה
useEffect(() => {
  registerSaveFunction(async () => {
    if (hasUnsavedChanges) {
      await handleSubmit(new Event('submit') as any);
    }
  });
}, [hasUnsavedChanges, registerSaveFunction]);

// עדכון מצב השינויים בכל שינוי בטופס
const handleInputChange = (e) => {
  setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  setHasUnsavedChanges(true);
};

// איפוס מצב השינויים אחרי שמירה מוצלחת
const handleSubmit = async () => {
  // ... לוגיקת שמירה
  setHasUnsavedChanges(false);
};
```

### בניווט:

```typescript
// שימוש ב-context הגלובלי לניווט בטוח
const { navigateWithUnsavedCheck } = useUnsavedChangesContext();

// במקום navigate('/path')
navigateWithUnsavedCheck('/path');
```

## הודעות למשתמש

המערכת מציגה הודעות בעברית:
- **כללי**: "יש שינויים לא שמורים. לשמור? (OK=שמור, Cancel=בטל)"

## יתרונות המערכת

1. **מניעת אובדן נתונים**: מונע מהמשתמש לאבד עבודה
2. **חוויית משתמש טובה**: התראות ברורות ובעברית
3. **גמישות**: עובד עם כל סוגי הניווט (כפתורים, לינקים, חזרה אחורה)
4. **קלות תחזוקה**: קוד מודולרי וניתן לשימוש חוזר
5. **ביצועים**: מעקב יעיל אחר שינויים ללא השפעה על ביצועים

## הערות טכניות

- המערכת משתמשת ב-React Context API לניהול מצב גלובלי
- ה-`beforeunload` event מוגבל בדפדפנים מודרניים אך עדיין עובד
- המערכת תומכת בכל סוגי הניווט של React Router
- הקוד מותאם לעברית ו-RTL
- **תיקון חשוב**: כל כפתורי הניווט (כולל "המטבח של מעיין") משתמשים ב-`navigateWithUnsavedCheck` במקום `navigate` רגיל
- המערכת מתאפסת אוטומטית כשעוברים לדפים שאינם עריכה/הוספה
