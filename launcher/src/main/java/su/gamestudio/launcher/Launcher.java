package su.gamestudio.launcher;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.awt.event.*;
import java.awt.image.BufferedImage;
import java.io.*;
import javax.imageio.ImageIO;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import java.util.List;
import java.util.regex.*;
import java.util.zip.ZipInputStream;

public final class Launcher {
    private static final String APP_VERSION = "0.1.0";
    private static final String MANIFEST_URL = "https://gamestudio.su/launcher/manifest.json";
    private static final String MANIFEST_FALLBACK_URL = "https://raw.githubusercontent.com/gamesstudii/landing/redesing/launcher/manifest.json";
    private static final Path ROOT = Paths.get(System.getenv("LOCALAPPDATA"), "GamesStudioLauncher");
    private static final Path GAMES_DIR = ROOT.resolve("games");
    private static final Path STATE_FILE = ROOT.resolve("library.properties");
    private static final Color BG = Color.decode("#000000"), PANEL = Color.decode("#000000"), TEXT = Color.decode("#FFFFFF"), MUTED = Color.decode("#B8C2B8"), GOLD = Color.decode("#64D52F");
    private final Properties installed = new Properties();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
    private JLabel status = new JLabel("Проверяем каталог…"), version = new JLabel(APP_VERSION), updateDot = new JLabel("●");
    private JPanel gamesPanel = new JPanel(new GridLayout(0, 3, 16, 16));
    private JButton mainAction = new JButton("ПРОВЕРИТЬ ОБНОВЛЕНИЯ");
    private JButton selectedAction = new JButton("СКАЧАТЬ");
    private Manifest manifest;
    private JFrame window;

    public static void main(String[] args) { SwingUtilities.invokeLater(() -> new Launcher().start()); }

    private void start() {
        try { Files.createDirectories(GAMES_DIR); if (Files.exists(STATE_FILE)) try (InputStream in = Files.newInputStream(STATE_FILE)) { installed.load(in); } }
        catch (IOException ignored) { }
        window = new JFrame("Games Studio Launcher");
        window.setUndecorated(true); window.setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE); window.setMinimumSize(new Dimension(970, 650));
        try (InputStream icon = Launcher.class.getResourceAsStream("/assets/Games Studio.png")) { if (icon != null) window.setIconImage(ImageIO.read(icon)); } catch (IOException ignored) { }
        window.setSize(1220, 760); window.setLocationRelativeTo(null); window.setContentPane(createUi()); window.setVisible(true); checkUpdates();
    }

    private JComponent createUi() {
        JPanel root = new JPanel(new BorderLayout()); root.setBackground(BG); root.add(windowBar(), BorderLayout.NORTH);
        JPanel side = new JPanel(); side.setBackground(Color.decode("#0c100d")); side.setBorder(new EmptyBorder(24, 18, 24, 18)); side.setLayout(new BoxLayout(side, BoxLayout.Y_AXIS)); side.setPreferredSize(new Dimension(280, 0));
        side.add(label("GAMES STUDIO", 19, TEXT)); side.add(Box.createVerticalStrut(56)); JLabel mark = label("TANKS WARS", 28, TEXT); side.add(mark); side.add(Box.createVerticalStrut(22)); styleButton(selectedAction, true); selectedAction.setMaximumSize(new Dimension(248, 54)); selectedAction.addActionListener(e -> runSelectedGame()); side.add(selectedAction); side.add(Box.createVerticalStrut(12)); JLabel installedLabel = small("●  ПРОВЕРКА ВЕРСИИ ИГРЫ"); side.add(installedLabel); side.add(Box.createVerticalStrut(28)); side.add(small("ОБ ИГРЕ")); JLabel info = new JLabel("<html><div style='width:210px'>Танковая тактическая игра с ангаром, развитием техники, событиями и боями.<br><br><b>ЖАНР</b> &nbsp; Танки, тактика, стратегия<br><b>ПЛАТФОРМЫ</b> &nbsp; Браузер, ПК<br><b>СТУДИЯ</b> &nbsp; Games Studio<br><b>СТАТУС</b> &nbsp; Доступно</div></html>"); info.setForeground(MUTED); info.setFont(new Font("Dialog", Font.PLAIN, 11)); info.setAlignmentX(Component.LEFT_ALIGNMENT); side.add(Box.createVerticalStrut(8)); side.add(info); side.add(Box.createVerticalGlue()); side.add(nav("⚙  НАСТРОЙКИ", false, () -> open(GAMES_DIR))); side.add(Box.createVerticalStrut(8)); side.add(nav("⇩  ОБНОВЛЕНИЯ", false, this::checkUpdates)); root.add(side, BorderLayout.WEST);
        JPanel content = new JPanel(); content.setBackground(Color.decode("#061009")); content.setBorder(new EmptyBorder(0, 24, 45, 30)); content.setLayout(new BoxLayout(content, BoxLayout.Y_AXIS));
        JPanel tabs = new JPanel(new FlowLayout(FlowLayout.LEFT, 0, 0)); tabs.setMaximumSize(new Dimension(Integer.MAX_VALUE, 54)); tabs.setBackground(Color.decode("#0a0e0b")); tabs.add(tab("◆", "TANKS WARS", true)); tabs.add(tab("✦", "ASHES OF NATIONS", false)); tabs.add(tab("◈", "SAVAGE ZONE", false)); content.add(tabs); content.add(Box.createVerticalStrut(20));
        JPanel banner = new JPanel(new BorderLayout()); banner.setBackground(Color.decode("#121b14")); banner.setMaximumSize(new Dimension(Integer.MAX_VALUE, 420)); banner.setPreferredSize(new Dimension(0, 420)); JLabel image = new JLabel(new ImageIcon(resourceImage("tanks-wars", 920, 420))); banner.add(image, BorderLayout.CENTER); content.add(banner); content.add(Box.createVerticalStrut(14)); JLabel headline = label("TANKS WARS — НОВОЕ ОБНОВЛЕНИЕ", 27, TEXT); content.add(headline); content.add(Box.createVerticalStrut(7)); status.setForeground(MUTED); status.setFont(new Font("Dialog", Font.PLAIN, 12)); content.add(status); content.add(Box.createVerticalStrut(28)); content.add(label("НОВОСТИ И ИГРЫ", 22, TEXT)); content.add(Box.createVerticalStrut(12)); gamesPanel.setBackground(Color.decode("#061009")); gamesPanel.setAlignmentX(Component.LEFT_ALIGNMENT); content.add(gamesPanel);
        JScrollPane scroll = new JScrollPane(content); scroll.setBorder(null); scroll.getViewport().setBackground(Color.decode("#061009")); scroll.getVerticalScrollBar().setUnitIncrement(16); root.add(scroll, BorderLayout.CENTER); return root;
    }

    private JComponent hero() {
        JPanel panel = new JPanel(new BorderLayout()); panel.setMaximumSize(new Dimension(Integer.MAX_VALUE, 282)); panel.setPreferredSize(new Dimension(0, 282)); panel.setBackground(Color.decode("#112943")); panel.setBorder(new EmptyBorder(38, 42, 38, 42));
        JPanel copy = new JPanel(); copy.setOpaque(false); copy.setLayout(new BoxLayout(copy, BoxLayout.Y_AXIS)); copy.add(small("В РАЗРАБОТКЕ")); copy.add(Box.createVerticalStrut(10)); copy.add(label("ASHES OF NATIONS", 42, TEXT)); copy.add(Box.createVerticalStrut(10)); JLabel desc = small("Стратегия о странах, сценариях и выборе пути государства."); desc.setForeground(Color.decode("#c3d0e1")); copy.add(desc); copy.add(Box.createVerticalGlue()); JButton b = new JButton("ОТКРЫТЬ КАТАЛОГ  →"); styleButton(b, true); b.addActionListener(e -> checkUpdates()); copy.add(b); panel.add(copy, BorderLayout.WEST); JLabel tag = small("GAMES STUDIO / 2026"); tag.setForeground(GOLD); panel.add(tag, BorderLayout.SOUTH); return panel;
    }

    private JComponent windowBar() {
        JPanel bar = new JPanel(new BorderLayout()); bar.setBackground(Color.decode("#070b08")); bar.setPreferredSize(new Dimension(0, 30));
        JLabel drag = new JLabel("  GAMES STUDIO LAUNCHER"); drag.setForeground(Color.decode("#738077")); drag.setFont(new Font("Dialog", Font.BOLD, 9));
        drag.addMouseMotionListener(new MouseMotionAdapter() { private Point origin; public void mouseDragged(MouseEvent e) { if (origin != null) window.setLocation(e.getXOnScreen() - origin.x, e.getYOnScreen() - origin.y); } public void mouseMoved(MouseEvent e) { origin = e.getPoint(); } });
        bar.add(drag, BorderLayout.CENTER); JPanel controls = new JPanel(new GridLayout(1, 3)); controls.setOpaque(false); controls.add(windowControl("—", () -> window.setState(Frame.ICONIFIED), false)); controls.add(windowControl("□", () -> window.setExtendedState(window.getExtendedState() == Frame.MAXIMIZED_BOTH ? Frame.NORMAL : Frame.MAXIMIZED_BOTH), false)); controls.add(windowControl("×", () -> window.dispose(), true)); bar.add(controls, BorderLayout.EAST); return bar;
    }

    private JButton windowControl(String symbol, Runnable action, boolean close) { JButton b = new JButton(symbol); b.setForeground(TEXT); b.setBackground(Color.decode("#070b08")); b.setBorderPainted(false); b.setFocusPainted(false); b.setFont(new Font("Dialog", Font.PLAIN, 16)); b.setPreferredSize(new Dimension(43, 30)); b.addMouseListener(new MouseAdapter() { public void mouseEntered(MouseEvent e) { b.setBackground(close ? Color.decode("#bb2727") : Color.decode("#26342a")); } public void mouseExited(MouseEvent e) { b.setBackground(Color.decode("#070b08")); } }); b.addActionListener(e -> action.run()); return b; }

    private JComponent tab(String icon, String text, boolean active) { JLabel tab = new JLabel(icon + "   " + text); tab.setOpaque(true); tab.setBackground(active ? Color.decode("#1a291c") : Color.decode("#070b08")); tab.setForeground(active ? TEXT : Color.decode("#7f8f82")); tab.setBorder(new EmptyBorder(0, 20, 0, 20)); tab.setFont(new Font("Dialog", Font.BOLD, 12)); tab.setPreferredSize(new Dimension(text.length() > 12 ? 198 : 145, 58)); return tab; }

    private JButton nav(String text, boolean active, Runnable action) { JButton b = new JButton(text); b.setAlignmentX(Component.LEFT_ALIGNMENT); b.setMaximumSize(new Dimension(244, 42)); b.setPreferredSize(new Dimension(244, 42)); b.setHorizontalAlignment(SwingConstants.LEFT); b.setBorder(new EmptyBorder(10, 12, 10, 10)); b.setForeground(active ? GOLD : MUTED); b.setFont(new Font("Dialog", Font.BOLD, 11)); b.setBackground(active ? Color.decode("#1b2c1c") : Color.decode("#0c100d")); b.setBorderPainted(false); b.setFocusPainted(false); if (action != null) b.addActionListener(e -> action.run()); return b; }
    private JLabel label(String text, int size, Color color) { JLabel l = new JLabel(text); l.setForeground(color); l.setFont(new Font("Arial Narrow", Font.BOLD, size)); return l; }
    private JLabel small(String text) { JLabel l = new JLabel(text); l.setForeground(GOLD); l.setFont(new Font("Dialog", Font.BOLD, 10)); return l; }
    private void styleButton(JButton button, boolean gold) { button.setBackground(gold ? GOLD : Color.decode("#142941")); button.setForeground(gold ? Color.decode("#131a24") : TEXT); button.setBorder(BorderFactory.createEmptyBorder(12, 17, 12, 17)); button.setFocusPainted(false); button.setFont(new Font("Dialog", Font.BOLD, 11)); }

    private void checkUpdates() {
        mainAction.setEnabled(false); status.setText("Проверяем обновления…"); new SwingWorker<Manifest, Void>() {
            protected Manifest doInBackground() throws Exception { try { return Manifest.read(http, MANIFEST_URL); } catch (Exception ignored) { return Manifest.read(http, MANIFEST_FALLBACK_URL); } }
            protected void done() { try { manifest = get(); renderGames(); Game first = manifest.games.isEmpty() ? null : manifest.games.get(0); String local = first == null ? "" : installed.getProperty(first.id + ".version", ""); selectedAction.setText(first == null ? "СКАЧАТЬ" : local.isBlank() ? "СКАЧАТЬ" : isNewer(first.version, local) ? "ОБНОВИТЬ" : "ИГРАТЬ"); selectedAction.setEnabled(first != null && !first.url.isBlank()); boolean newer = isNewer(manifest.launcherVersion, APP_VERSION); updateDot.setVisible(newer); status.setText(newer ? "Доступно обновление лаунчера" : "Все данные каталога актуальны"); if (newer && !manifest.launcherUrl.isBlank()) askLauncherUpdate(); } catch (Exception e) { status.setText("Не удалось получить каталог обновлений."); } finally { mainAction.setEnabled(true); } }
        }.execute();
    }

    private void renderGames() {
        gamesPanel.removeAll(); for (Game game : manifest.games) gamesPanel.add(gameCard(game)); gamesPanel.revalidate(); gamesPanel.repaint();
    }
    private void runSelectedGame() {
        if (manifest == null || manifest.games.isEmpty()) { checkUpdates(); return; }
        Game game = manifest.games.get(0); String local = installed.getProperty(game.id + ".version", "");
        if (local.isBlank() || isNewer(game.version, local)) install(game, selectedAction); else launch(game);
    }
    private JComponent gameCard(Game game) {
        JPanel card = new JPanel(new BorderLayout()); card.setBackground(Color.decode("#111a13")); card.setPreferredSize(new Dimension(330, 254)); card.setBorder(BorderFactory.createLineBorder(Color.decode("#36533a")));
        JLabel art = new JLabel(); art.setIcon(new ImageIcon(resourceImage(game.id, 330, 175))); art.setPreferredSize(new Dimension(330, 175)); card.add(art, BorderLayout.CENTER);
        JPanel bottom = new JPanel(new BorderLayout()); bottom.setBackground(Color.decode("#0a0f0b")); bottom.setBorder(new EmptyBorder(12, 15, 12, 15)); String local = installed.getProperty(game.id + ".version", ""); JLabel gameTitle = label(game.title.toUpperCase(), 16, TEXT); bottom.add(gameTitle, BorderLayout.WEST);
        boolean ready = !game.url.isBlank(); boolean update = !local.isBlank() && isNewer(game.version, local); JButton action = new JButton(local.isBlank() ? "УСТАНОВИТЬ" : update ? "ОБНОВИТЬ" : "ИГРАТЬ"); action.setEnabled(ready); action.setForeground(GOLD); action.setBackground(Color.decode("#0a0f0b")); action.setBorderPainted(false); action.setFont(new Font("Dialog", Font.BOLD, 11)); action.addActionListener(e -> { if (local.isBlank() || update) install(game, action); else launch(game); }); bottom.add(action, BorderLayout.EAST); card.add(bottom, BorderLayout.SOUTH); return card;
    }

    private Image resourceImage(String id, int width, int height) { String file = id.equals("ashes-of-nations") ? "ashes-of-nations.png" : id.equals("tanks-wars") ? "tanks-wars.png" : "tanks-wars-new-era.png"; try (InputStream in = Launcher.class.getResourceAsStream("/assets/" + file)) { BufferedImage source = ImageIO.read(in); Image scaled = source.getScaledInstance(width, height, Image.SCALE_SMOOTH); return scaled; } catch (Exception e) { BufferedImage fallback = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB); Graphics2D g = fallback.createGraphics(); g.setPaint(new GradientPaint(0, 0, Color.decode("#173d60"), width, height, Color.decode("#071421"))); g.fillRect(0, 0, width, height); g.dispose(); return fallback; } }

    private void install(Game game, JButton button) {
        button.setEnabled(false); new SwingWorker<Void, Integer>() {
            protected Void doInBackground() throws Exception { publish(0); Path temp = Files.createTempFile("gs-" + game.id, game.type.equals("zip") ? ".zip" : ".exe"); HttpRequest req = HttpRequest.newBuilder(URI.create(game.url)).GET().build(); http.send(req, HttpResponse.BodyHandlers.ofFile(temp)); publish(75); if (game.type.equals("zip")) { Path dir = GAMES_DIR.resolve(game.id); delete(dir); Files.createDirectories(dir); unzip(temp, dir); installed.setProperty(game.id + ".version", game.version); installed.setProperty(game.id + ".exe", game.executable); try (OutputStream out = Files.newOutputStream(STATE_FILE)) { installed.store(out, "Games Studio Launcher"); } } else open(temp); Files.deleteIfExists(temp); publish(100); return null; }
            protected void process(List<Integer> p) { button.setText("ЗАГРУЗКА " + p.get(p.size()-1) + "%"); }
            protected void done() { button.setEnabled(true); try { get(); status.setText(game.type.equals("zip") ? game.title + " готова к запуску" : "Установщик " + game.title + " открыт"); renderGames(); } catch (Exception e) { status.setText("Ошибка установки: " + e.getMessage()); button.setText("ПОВТОРИТЬ"); } }
        }.execute();
    }
    private void launch(Game game) { Path exe = GAMES_DIR.resolve(game.id).resolve(installed.getProperty(game.id + ".exe", game.executable)); if (!Files.exists(exe)) { status.setText("Не найден файл игры. Установите её снова."); return; } try { new ProcessBuilder(exe.toString()).directory(exe.getParent().toFile()).start(); } catch (IOException e) { status.setText("Не удалось запустить игру."); } }
    private void askLauncherUpdate() { if (JOptionPane.showConfirmDialog(null, "Доступен лаунчер " + manifest.launcherVersion + ". Скачать установщик?", "Обновление", JOptionPane.YES_NO_OPTION) == JOptionPane.YES_OPTION) openUrl(manifest.launcherUrl); }
    private static void unzip(Path zip, Path target) throws IOException { try (ZipInputStream in = new ZipInputStream(Files.newInputStream(zip))) { for (java.util.zip.ZipEntry e; (e = in.getNextEntry()) != null;) { Path out = target.resolve(e.getName()).normalize(); if (!out.startsWith(target)) throw new IOException("Некорректный путь в архиве"); if (e.isDirectory()) Files.createDirectories(out); else { Files.createDirectories(out.getParent()); Files.copy(in, out, StandardCopyOption.REPLACE_EXISTING); } } } }
    private static void delete(Path p) throws IOException { if (Files.exists(p)) try (var s = Files.walk(p)) { s.sorted(Comparator.reverseOrder()).forEach(x -> { try { Files.delete(x); } catch (IOException e) { throw new UncheckedIOException(e); } }); } }
    private static boolean isNewer(String remote, String local) { String[] a=remote.split("\\."), b=local.split("\\."); for(int i=0;i<Math.max(a.length,b.length);i++){ int x=i<a.length?Integer.parseInt(a[i]):0,y=i<b.length?Integer.parseInt(b[i]):0; if(x!=y)return x>y;} return false; }
    private static void open(Path p) { try { Desktop.getDesktop().open(p.toFile()); } catch (IOException ignored) { } }
    private static void openUrl(String s) { try { Desktop.getDesktop().browse(URI.create(s)); } catch (Exception ignored) { } }

    private record Game(String id, String title, String description, String version, String type, String url, String executable) {}
    private record Manifest(String launcherVersion, String launcherUrl, List<Game> games) {
        static Manifest read(HttpClient client, String url) throws Exception { String json = client.send(HttpRequest.newBuilder(URI.create(url)).GET().build(), HttpResponse.BodyHandlers.ofString()).body(); String l = value(json, "launcher", "version"), u=value(json,"launcher","installerUrl"); List<Game> games=new ArrayList<>(); Matcher m=Pattern.compile("\\{\\s*\\\"id\\"+"[\\s\\S]*?\\}").matcher(json); while(m.find()){String o=m.group(); games.add(new Game(v(o,"id"),v(o,"title"),v(o,"description"),v(o,"version"),v(o,"packageType"),v(o,"downloadUrl"),v(o,"executable")));} return new Manifest(l,u,games); }
        static String value(String json,String section,String key){ Matcher m=Pattern.compile("\\\""+section+"\\\"\\s*:\\s*\\{([\\s\\S]*?)\\}").matcher(json); return m.find()?v(m.group(1),key):""; }
        static String v(String text,String key){ Matcher m=Pattern.compile("\\\""+key+"\\\"\\s*:\\s*\\\"([^\\\"]*)\\\"").matcher(text); return m.find()?m.group(1):""; }
    }
}
